from fastapi import APIRouter, HTTPException, Depends, Request
from deps import db, get_current_user
import re
import uuid
import logging
import asyncio
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

REF_PATTERN = re.compile(r'^[A-Z]{1,3}\d{2,6}(\.\d{1,4})?$', re.IGNORECASE)

_executor = ThreadPoolExecutor(max_workers=2)

XD_CATEGORY_MAP = {
    "textile": "Textile",
    "bags & travel": "Sac",
    "drinkware": "Gourde",
    "writing": "Ecriture",
    "mobile tech": "Tech",
    "outdoor & sport": "Sport",
    "home & living": "Maison",
    "tools & car": "Outils",
    "food & kitchen": "Cuisine",
    "personal care": "Soin",
    "office & business": "Bureau",
}


def _scrape_xd_product(ref: str) -> dict:
    """Synchronous Playwright scraper for XD Connects product page."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
        )
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        )
        page = context.new_page()

        try:
            page.goto(
                f'https://www.xdconnects.com/en-gb/{ref.lower()}',
                wait_until='networkidle',
                timeout=30000
            )
            page.wait_for_timeout(3000)
        except Exception as e:
            browser.close()
            raise RuntimeError(f"Impossible de charger la page: {e}")

        h1 = page.query_selector('h1')
        if not h1:
            browser.close()
            return None

        h1_text = h1.inner_text().strip()
        if 'error' in h1_text.lower() or '404' in h1_text or '403' in h1_text:
            browser.close()
            return None

        final_url = page.url
        html = page.content()
        name = h1_text

        # --- Extract from specification tables ---
        tds = page.query_selector_all('td')
        specs = {}
        for i, td in enumerate(tds):
            text = td.inner_text().strip()
            if text in [
                'Brand', 'Material', 'Grammage', 'Product category',
                'Subcategory', 'Colour', 'Description', 'Fit',
                'Fabric', 'Volume', 'Fits laptop size', 'Secondary material',
            ] and i + 1 < len(tds):
                specs[text] = tds[i + 1].inner_text().strip()

        brand = specs.get('Brand', '')
        material = specs.get('Material', '')
        grammage = specs.get('Grammage', '')
        category_raw = specs.get('Product category', '')
        subcategory = specs.get('Subcategory', '')
        description = specs.get('Description', '')[:500]

        # Category mapping
        category = 'Accessoire'
        for key, val in XD_CATEGORY_MAP.items():
            if key in category_raw.lower():
                category = val
                break

        # --- Price ---
        price = 0
        # Try price class elements first
        for el in page.query_selector_all('[class*="rice"]'):
            text = el.inner_text().strip()
            m = re.search(r'€\s*([\d]+[,.][\d]{0,2})', text)
            if m:
                price = float(m.group(1).replace(',', '.'))
                if price > 0:
                    break

        # Fallback: regex on full HTML
        if price == 0:
            price_matches = re.findall(r'€\s*([\d]+[,.][\d]{0,2})', html)
            for pm in price_matches:
                p_val = float(pm.replace(',', '.'))
                if p_val > 0:
                    price = p_val
                    break

        # --- Image ---
        image_url = ''
        large_img = page.query_selector('img[src*="/image/large/"]')
        if large_img:
            image_url = large_img.get_attribute('src') or ''
            if not image_url.startswith('http'):
                image_url = f'https://www.xdconnects.com{image_url}'

        # --- Sizes ---
        sizes = []
        size_labels = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '3XL', '4XL', '5XL']
        for el in page.query_selector_all('button, option'):
            txt = el.inner_text().strip()
            if txt in size_labels and txt not in sizes:
                sizes.append(txt)
        if not sizes:
            found = re.findall(r'\b(' + '|'.join(size_labels) + r')\b', html)
            sizes = list(dict.fromkeys(found))

        # --- Colors ---
        colors = []
        seen_colors = set()
        for img in page.query_selector_all('img[src*="/image/small/"]'):
            alt = (img.get_attribute('alt') or '').strip()
            if alt and len(alt) < 50:
                parts = alt.split()
                ref_prefix = ref.replace('.', '')[:3].upper()
                if len(parts) >= 2 and parts[0].upper().startswith(ref_prefix):
                    color = ' '.join(parts[1:])
                else:
                    color = alt
                if color.lower() not in seen_colors:
                    seen_colors.add(color.lower())
                    colors.append(color.title())

        # If no colors from small images, try large image alt
        if not colors:
            color_from_spec = specs.get('Colour', '')
            if color_from_spec:
                colors = [color_from_spec.title()]

        # --- USPs ---
        usps = []
        for el in page.query_selector_all('img[src*="vinkje"]'):
            parent = el.evaluate_handle('e => e.parentElement')
            parent_el = parent.as_element()
            if parent_el:
                usp_text = parent_el.inner_text().strip()
                if usp_text and len(usp_text) > 5 and usp_text not in usps:
                    usps.append(usp_text)

        # Product USPs from table
        for i, td in enumerate(tds):
            if 'Product USPs' in td.inner_text():
                if i + 1 < len(tds):
                    usps_cell = tds[i + 1]
                    for li in usps_cell.query_selector_all('li'):
                        t = li.inner_text().strip()
                        if t and t not in usps:
                            usps.append(t)
                break

        # Short description
        short_parts = []
        if material:
            short_parts.append(material)
        if grammage:
            short_parts.append(grammage)
        extra = specs.get('Fit', '') or specs.get('Volume', '')
        if extra:
            short_parts.append(extra)
        short_description = ' — '.join(short_parts)

        browser.close()

        return {
            'ref': ref.upper(),
            'name': name,
            'description': description if description else short_description if short_description else name,
            'short_description': short_description,
            'price': price,
            'sizes': sizes,
            'colors': colors,
            'category': category,
            'subcategory': subcategory,
            'image_url': image_url,
            'source_url': final_url,
            'brand': brand,
            'material': material,
            'grammage': grammage,
            'usps': usps,
        }


@router.get("/provider/import/xdconnects/lookup/{ref}")
async def lookup_xdconnects_reference(ref: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")

    ref = ref.upper().strip()
    if not REF_PATTERN.match(ref):
        raise HTTPException(
            status_code=400,
            detail="Reference invalide. Format attendu: T9101, P706.33, V43009..."
        )

    existing = await db.provider_products.find_one({
        "provider_id": current_user['user_id'],
        "xdconnects_ref": ref
    })
    if existing:
        raise HTTPException(status_code=409, detail=f"Le produit {ref} est deja dans votre catalogue")

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(_executor, _scrape_xd_product, ref)
    except Exception as e:
        logger.error(f"XDConnects lookup error for {ref}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la recherche: {str(e)}")

    if not result:
        raise HTTPException(status_code=404, detail=f"Reference {ref} non trouvee sur XD Connects")

    return {"product": result}


@router.post("/provider/import/xdconnects/add-single")
async def import_single_xdconnects_product(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")

    data = await request.json()
    p = data.get("product", {})
    ref = p.get("ref", "").upper()

    existing = await db.provider_products.find_one({
        "provider_id": current_user['user_id'],
        "xdconnects_ref": ref
    })
    if existing:
        raise HTTPException(status_code=409, detail=f"Le produit {ref} est deja dans votre catalogue")

    product = {
        "product_id": f"pprod_{uuid.uuid4().hex[:12]}",
        "provider_id": current_user['user_id'],
        "xdconnects_ref": ref,
        "name": p.get("name", ref),
        "description": p.get("description", ""),
        "category": p.get("category", "Accessoire"),
        "price": float(p.get("price", 0)),
        "sizes": p.get("sizes", []),
        "colors": p.get("colors", []),
        "stock": 100,
        "sold": 0,
        "image_url": p.get("image_url", ""),
        "images": [p.get("image_url", "")] if p.get("image_url") else [],
        "suggested_commission": 5,
        "source": "xdconnects",
        "source_url": p.get("source_url", ""),
        "brand": p.get("brand", ""),
        "material": p.get("material", ""),
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.provider_products.insert_one(product)
    return {
        "message": f"Produit {ref} importe avec succes",
        "product_id": product["product_id"]
    }
