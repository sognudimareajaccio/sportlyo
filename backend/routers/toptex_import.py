from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request, BackgroundTasks
from deps import db, get_current_user
import fitz  # PyMuPDF
import re
import uuid
import tempfile
import os
import httpx
import logging
import asyncio
from datetime import datetime, timezone
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# In-memory store for background PDF processing tasks
_pdf_tasks = {}

TOPTEX_IMG = "https://cdn.toptex.com/pictures"

# Known color translations for display
COLOR_MAP = {
    "BLACK": "Noir", "WHITE": "Blanc", "NAVY": "Marine", "RED": "Rouge",
    "SPORTY RED": "Rouge Sport", "SPORTY ROYAL BLUE": "Bleu Royal",
    "SPORTY YELLOW": "Jaune Sport", "DARK GREEN": "Vert Fonce",
    "GREY": "Gris", "LIGHT GREY": "Gris Clair", "DARK GREY": "Gris Fonce",
    "ORANGE": "Orange", "FLUORESCENT YELLOW": "Jaune Fluo",
    "FLUORESCENT ORANGE": "Orange Fluo", "FLUORESCENT GREEN": "Vert Fluo",
    "FLUORESCENT PINK": "Rose Fluo", "LIME": "Citron Vert",
    "AQUA": "Aqua", "PURPLE": "Violet", "SKY BLUE": "Bleu Ciel",
    "LIGHT TURQUOISE": "Turquoise Clair", "WINE": "Bordeaux",
}

CATEGORY_MAP = {
    "MAILLOTS": "Maillot", "RUGBY": "Rugby", "BASKET": "Basket",
    "MULTISPORT": "Multisport", "CHASUBLES": "Chasuble",
    "SWEAT": "Sweat", "T-SHIRTS": "T-shirt", "POLOS": "Polo",
    "PANTALONS": "Pantalon", "SHORTS": "Short", "VESTES": "Veste",
    "SACS": "Sac", "CHAUSSETTES": "Chaussettes", "CASQUETTES": "Casquette",
    "BONNETS": "Bonnet", "BAGAGERIE": "Bagagerie", "CROSS TRAINING": "Cross Training",
    "FITNESS": "Fitness", "PROTECTION UV": "Protection UV",
    "TEAMWEAR": "Teamwear", "COMPRESSION": "Compression",
    "SECONDE PEAU": "Seconde Peau", "SURVÊTEMENTS": "Survetement",
}


def parse_toptex_pdf(pdf_path: str) -> list:
    doc = fitz.open(pdf_path)
    products = {}
    current_category = "Sport"

    for page_idx in range(doc.page_count):
        text = doc[page_idx].get_text()
        if not text.strip():
            continue

        lines = [l.strip() for l in text.split('\n') if l.strip()]

        # Detect category
        for cat_key, cat_val in CATEGORY_MAP.items():
            if cat_key in text.upper():
                current_category = cat_val
                break

        # Find all product references on this page
        refs = re.findall(r'\b(PA\d{3,5}|K\d{3,5}|KP\d{3,5}|KI\d{3,5}|NS\d{3,5})\b', text)
        prices = re.findall(r'€([\d,]+)', text)

        # Find sizes
        size_patterns = re.findall(
            r'((?:(?:XS|XXS|S|M|L|XL|XXL|3XL|4XL|UNIQUE|[0-9]+/[0-9]+ ANS)'
            r'(?:\s*-\s*(?:XS|XXS|S|M|L|XL|XXL|3XL|4XL|UNIQUE|[0-9]+/[0-9]+ ANS))+))',
            text
        )

        # Find colors - they appear before the refs as lines with CAPS color names
        color_lines = []
        for line in lines:
            cleaned = line.replace('/', ' ').strip()
            if cleaned.upper() in COLOR_MAP or re.match(r'^[A-Z\s/]+$', cleaned) and len(cleaned) > 2 and cleaned not in ['SPORT', 'CERTIFICATION SUR', 'DEMANDE']:
                # Check if it looks like a color
                if any(c in cleaned.upper() for c in ['BLACK', 'WHITE', 'NAVY', 'RED', 'BLUE', 'GREEN', 'GREY', 'ORANGE', 'YELLOW', 'PINK', 'PURPLE', 'AQUA', 'LIME', 'WINE', 'TURQUOISE', 'DARK', 'LIGHT', 'FLUORESCENT', 'SPORTY', 'SKY']):
                    color_lines.append(cleaned)

        # Find product names (usually in CAPS after the category, contains descriptive words)
        name_patterns = re.findall(
            r'((?:MAILLOT|SHORT|T-SHIRT|POLO|SWEAT|VESTE|PANTALON|SAC|CASQUETTE|BONNET|'
            r'DÉBARDEUR|CHASUBLE|BODY|BRASSIÈRE|LEGGING|JOGGING|MANCHON|POIGNET|CHAUSSETTES|'
            r'TRI-SUIT|COMBINAISON|PROTÈGE|BALLON|SURVÊTEMENT|PARKA|COUPE-VENT|GILET|DOUDOUNE|'
            r'PONCHO|SERVIETTE|BANDANA|TOUR DE COU|SAC À DOS|GOURDE|MÉDAILLE|DRAP DE BAIN)'
            r'[A-ZÀ-Ü\s\-\']+)',
            text, re.IGNORECASE
        )

        # Find descriptions (g/m2 lines)
        desc_patterns = re.findall(r'(\d+\s*g/m[2²][^.]*\.)', text)

        for i, ref in enumerate(set(refs)):
            if ref in products:
                # Merge colors if found more
                existing_colors = set(products[ref].get('colors_raw', []))
                existing_colors.update(color_lines)
                products[ref]['colors_raw'] = list(existing_colors)
                continue

            price = ""
            if prices:
                idx = min(i, len(prices) - 1)
                price = prices[idx].replace(',', '.')

            sizes_str = size_patterns[0] if size_patterns else ""
            sizes_list = [s.strip() for s in sizes_str.split(' - ')] if sizes_str else []

            name = name_patterns[i] if i < len(name_patterns) else (name_patterns[0] if name_patterns else "")
            name = re.sub(r'\s+', ' ', name).strip().title() if name else ref

            desc = desc_patterns[i] if i < len(desc_patterns) else (desc_patterns[0] if desc_patterns else "")

            products[ref] = {
                'ref': ref,
                'name': name,
                'description': desc,
                'price': float(price) if price else 0,
                'sizes': sizes_list,
                'colors_raw': color_lines.copy(),
                'category': current_category,
                'page': page_idx + 1,
                'image_url': f"{TOPTEX_IMG}/{ref}_2025.jpg",
            }

    doc.close()

    # Clean up colors
    result = []
    for ref, p in sorted(products.items()):
        colors = []
        for c in p.get('colors_raw', []):
            c_upper = c.upper().strip()
            if c_upper in COLOR_MAP:
                colors.append(COLOR_MAP[c_upper])
            elif '/' in c:
                parts = [part.strip() for part in c.split('/')]
                translated = []
                for part in parts:
                    translated.append(COLOR_MAP.get(part.upper(), part.title()))
                colors.append('/'.join(translated))
            else:
                colors.append(c.title())
        p['colors'] = list(dict.fromkeys(colors))  # deduplicate preserving order
        del p['colors_raw']
        result.append(p)

    return result


def _process_pdf_sync(task_id: str, pdf_path: str):
    """Process PDF synchronously in background thread."""
    try:
        _pdf_tasks[task_id]["status"] = "processing"
        products = parse_toptex_pdf(pdf_path)
        _pdf_tasks[task_id]["status"] = "done"
        _pdf_tasks[task_id]["products"] = products
        _pdf_tasks[task_id]["total"] = len(products)
    except Exception as e:
        logger.error(f"PDF processing error for task {task_id}: {e}")
        _pdf_tasks[task_id]["status"] = "error"
        _pdf_tasks[task_id]["error"] = str(e)
    finally:
        try:
            os.unlink(pdf_path)
        except:
            pass


@router.post("/provider/import/parse-pdf")
async def parse_toptex_catalog(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")

    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Fichier PDF requis")

    # Stream file to disk in chunks to handle large files
    tmp_path = os.path.join(tempfile.gettempdir(), f"toptex_{uuid.uuid4().hex}.pdf")
    total_size = 0
    max_size = 100 * 1024 * 1024  # 100MB limit

    try:
        with open(tmp_path, "wb") as f:
            while True:
                chunk = await file.read(512 * 1024)  # 512KB chunks
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > max_size:
                    os.unlink(tmp_path)
                    raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 100MB)")
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"Erreur upload: {str(e)}")

    # Create a background task
    task_id = uuid.uuid4().hex[:16]
    _pdf_tasks[task_id] = {"status": "uploading", "products": [], "total": 0, "error": None}

    # Run the CPU-intensive PDF processing in a thread
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _process_pdf_sync, task_id, tmp_path)

    return {"task_id": task_id, "message": "Analyse du PDF en cours..."}


@router.get("/provider/import/pdf-status/{task_id}")
async def get_pdf_task_status(task_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")

    task = _pdf_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tache non trouvee")

    if task["status"] == "done":
        products = task["products"]
        # Clean up task after retrieval
        del _pdf_tasks[task_id]
        return {"status": "done", "products": products, "total": len(products)}
    elif task["status"] == "error":
        error = task["error"]
        del _pdf_tasks[task_id]
        raise HTTPException(status_code=500, detail=f"Erreur d'analyse: {error}")
    else:
        return {"status": task["status"]}


@router.post("/provider/import/confirm")
async def import_toptex_products(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")

    data = await request.json()
    products = data.get("products", [])
    if not products:
        raise HTTPException(status_code=400, detail="Aucun produit a importer")

    imported = 0
    skipped = 0
    for p in products:
        ref = p.get("ref", "")
        existing = await db.provider_products.find_one({
            "provider_id": current_user['user_id'],
            "toptex_ref": ref
        })
        if existing:
            skipped += 1
            continue

        product = {
            "product_id": f"pprod_{uuid.uuid4().hex[:12]}",
            "provider_id": current_user['user_id'],
            "toptex_ref": ref,
            "name": p.get("name", ref),
            "description": p.get("description", ""),
            "category": p.get("category", "Sport"),
            "price": float(p.get("price", 0)),
            "sizes": p.get("sizes", []),
            "colors": p.get("colors", []),
            "stock": int(p.get("stock", 100)),
            "sold": 0,
            "image_url": p.get("image_url", ""),
            "suggested_commission": 5,
            "source": "toptex",
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.provider_products.insert_one(product)
        imported += 1

    return {
        "imported": imported,
        "skipped": skipped,
        "message": f"{imported} produit(s) importé(s), {skipped} déjà existant(s)"
    }



@router.get("/provider/import/lookup/{ref}")
async def lookup_toptex_reference(ref: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")

    ref = ref.upper().strip()
    if not re.match(r'^(PA|K|KP|KI|NS|WK)\d{3,5}$', ref):
        raise HTTPException(status_code=400, detail="Reference invalide. Format attendu: PA4045, K356, KP111...")

    # Check if already imported
    existing = await db.provider_products.find_one({"provider_id": current_user['user_id'], "toptex_ref": ref})
    if existing:
        raise HTTPException(status_code=409, detail=f"Le produit {ref} est deja dans votre catalogue")

    try:
        # Step 1: Search on TopTex to find the product URL
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            search_res = await client.get(
                f"https://www.toptex.fr/catalogsearch/result/",
                params={"q": ref},
                headers={"User-Agent": "Mozilla/5.0"}
            )

        soup = BeautifulSoup(search_res.text, 'html.parser')

        # Find product link from search results
        product_url = None
        for a in soup.find_all('a', href=True):
            href = a['href']
            if ref.lower() in href.lower() and href.startswith('https://www.toptex.fr/') and href.endswith('.html'):
                product_url = href
                break

        if not product_url:
            raise HTTPException(status_code=404, detail=f"Reference {ref} non trouvee sur TopTex")

        # Step 2: Scrape the product page
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            prod_res = await client.get(product_url, headers={"User-Agent": "Mozilla/5.0"})

        soup = BeautifulSoup(prod_res.text, 'html.parser')

        # Extract product name
        name = ""
        h1 = soup.find('h1')
        if h1:
            name = h1.get_text(strip=True)
            # Remove the ref prefix if present
            name = re.sub(r'^' + ref + r'\s*-?\s*', '', name, flags=re.IGNORECASE).strip()

        # Extract brand
        brand = ""
        brand_img = soup.find('img', alt=True, src=lambda x: x and 'logos' in x)
        if brand_img:
            brand = brand_img.get('alt', '').replace('®', '').strip()

        # Extract price
        price = 0
        price_cells = soup.find_all('td')
        for cell in price_cells:
            text = cell.get_text(strip=True)
            match = re.search(r'(\d+[,\.]\d{2})\s*€', text)
            if match:
                price = float(match.group(1).replace(',', '.'))
                break

        # Extract colors from sticker images (most reliable source)
        colors = []
        for img in soup.find_all('img', src=True, alt=True):
            src = img.get('src', '')
            alt = img.get('alt', '').strip()
            if 'stickers/' in src and alt and len(alt) < 60:
                if alt not in colors:
                    colors.append(alt)
        colors = list(dict.fromkeys(colors))[:12]  # dedupe, max 12

        # Translate colors (handle multi-color like "Black / White")
        translated_colors = []
        for c in colors:
            if '/' in c:
                parts = [p.strip() for p in c.split('/')]
                translated_parts = [COLOR_MAP.get(p.upper(), p) for p in parts]
                translated = ' / '.join(translated_parts)
            else:
                translated = COLOR_MAP.get(c.upper(), c)
            if translated not in translated_colors:
                translated_colors.append(translated)

        # Extract sizes
        sizes = []
        size_pattern = re.findall(r'\b(XXS|XS|S|M|L|XL|XXL|3XL|4XL|5XL)\b', prod_res.text)
        sizes = list(dict.fromkeys(size_pattern))

        # Extract description
        description = ""
        desc_parts = []
        # Weight/composition
        weight_match = re.search(r'(\d+\s*g/m[2²])', prod_res.text)
        if weight_match:
            desc_parts.append(weight_match.group(1))

        # Composition
        comp_match = re.search(r'(\d+%\s*(?:polyester|coton|cotton|elasthanne|nylon|viscose)[^.]*\.)', prod_res.text, re.IGNORECASE)
        if comp_match:
            desc_parts.append(comp_match.group(1))

        # Bullet points from page
        for li in soup.find_all('li'):
            txt = li.get_text(strip=True)
            if txt and len(txt) > 10 and len(txt) < 100 and any(w in txt.lower() for w in ['léger', 'rapide', 'confort', 'respirant', 'stretch', 'coupe', 'maille', 'lavable', 'traitement']):
                desc_parts.append(txt)
                if len(desc_parts) >= 5:
                    break

        description = ' — '.join(desc_parts) if desc_parts else name

        # Image URL - extract from og:image meta tag (most reliable)
        image_url = ""
        og_img = soup.find('meta', property='og:image')
        if og_img and og_img.get('content'):
            image_url = og_img['content']
            # Ensure good resolution
            if '?w=' not in image_url:
                image_url += '?w=660'
            elif '?w=' in image_url:
                image_url = re.sub(r'\?w=\d+', '?w=660', image_url)

        # Fallback: find main product image from gallery
        if not image_url:
            for img in soup.find_all('img', src=True):
                src = img['src']
                if f'{ref}_' in src and 'cdn.toptex.com/pictures' in src:
                    image_url = re.sub(r'\?w=\d+', '', src) + '?w=660'
                    break

        # Final fallback: construct URL
        if not image_url:
            image_url = f"https://cdn.toptex.com/pictures/{ref}_2026.jpg?w=660"

        # Determine category
        category = "Sport"
        name_lower = name.lower()
        if any(w in name_lower for w in ['maillot', 't-shirt', 'tee-shirt']):
            category = "Maillot"
        elif any(w in name_lower for w in ['short']):
            category = "Short"
        elif any(w in name_lower for w in ['pantalon', 'jogging', 'legging', 'surv']):
            category = "Pantalon"
        elif any(w in name_lower for w in ['veste', 'coupe-vent', 'parka', 'doudoune', 'gilet', 'softshell']):
            category = "Veste"
        elif any(w in name_lower for w in ['sweat', 'hoodie', 'capuche']):
            category = "Sweat"
        elif any(w in name_lower for w in ['polo']):
            category = "Polo"
        elif any(w in name_lower for w in ['sac', 'bag', 'bagagerie']):
            category = "Sac"
        elif any(w in name_lower for w in ['casquette', 'bonnet', 'bandana', 'tour de cou']):
            category = "Accessoire"
        elif any(w in name_lower for w in ['chaussette', 'socquette']):
            category = "Chaussettes"
        elif any(w in name_lower for w in ['débardeur', 'brassière', 'body']):
            category = "Textile"

        result = {
            "ref": ref,
            "name": f"{brand + ' — ' if brand else ''}{name}" if name else ref,
            "description": description,
            "price": price,
            "sizes": sizes,
            "colors": translated_colors if translated_colors else colors,
            "category": category,
            "image_url": image_url,
            "source_url": product_url,
            "brand": brand
        }

        return {"product": result}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TopTex lookup error for {ref}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la recherche: {str(e)}")


@router.post("/provider/import/add-single")
async def import_single_toptex_product(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")

    data = await request.json()
    p = data.get("product", {})
    ref = p.get("ref", "")

    existing = await db.provider_products.find_one({"provider_id": current_user['user_id'], "toptex_ref": ref})
    if existing:
        raise HTTPException(status_code=409, detail=f"Le produit {ref} est deja dans votre catalogue")

    product = {
        "product_id": f"pprod_{uuid.uuid4().hex[:12]}",
        "provider_id": current_user['user_id'],
        "toptex_ref": ref,
        "name": p.get("name", ref),
        "description": p.get("description", ""),
        "category": p.get("category", "Sport"),
        "price": float(p.get("price", 0)),
        "sizes": p.get("sizes", []),
        "colors": p.get("colors", []),
        "stock": 100,
        "sold": 0,
        "image_url": p.get("image_url", ""),
        "suggested_commission": 5,
        "source": "toptex",
        "source_url": p.get("source_url", ""),
        "brand": p.get("brand", ""),
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.provider_products.insert_one(product)
    return {"message": f"Produit {ref} importé avec succès", "product_id": product["product_id"]}
