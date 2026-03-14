from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from deps import db, get_current_user
import fitz  # PyMuPDF
import re
import uuid
import tempfile
import os
from datetime import datetime, timezone

router = APIRouter(prefix="/api")

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


@router.post("/provider/import/parse-pdf")
async def parse_toptex_catalog(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")

    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Fichier PDF requis")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    try:
        content = await file.read()
        tmp.write(content)
        tmp.close()
        products = parse_toptex_pdf(tmp.name)
        return {"products": products, "total": len(products)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'analyse: {str(e)}")
    finally:
        os.unlink(tmp.name)


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
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.provider_products.insert_one(product)
        imported += 1

    return {
        "imported": imported,
        "skipped": skipped,
        "message": f"{imported} produit(s) importé(s), {skipped} déjà existant(s)"
    }
