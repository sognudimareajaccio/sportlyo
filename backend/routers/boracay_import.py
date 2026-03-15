from fastapi import APIRouter, HTTPException, Depends, Request
from deps import db, get_current_user
import re
import uuid
import logging
import httpx
from datetime import datetime, timezone
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

BORACAY_BASE = "https://www.boracay.fr"

BORACAY_CATEGORIES = {
    "porte-cles": {"id": 130, "label": "Porte-cles"},
    "metallerie": {"id": 151, "label": "Metallerie"},
    "drink": {"id": 146, "label": "Gourde & Drink"},
    "accessoires": {"id": 157, "label": "Accessoires"},
    "lanyard-lacet": {"id": 216, "label": "Lanyard & Lacet"},
    "high-tech": {"id": 124, "label": "High-Tech"},
    "outdoor": {"id": 133, "label": "Outdoor & Sport"},
    "bagagerie": {"id": 136, "label": "Bagagerie"},
    "green": {"id": 227, "label": "Green / Eco"},
    "coffrets-cadeaux": {"id": 247, "label": "Coffrets Cadeaux"},
    "packaging": {"id": 214, "label": "Packaging"},
    "stylos": {"id": None, "label": "Stylos"},
    "express": {"id": 140, "label": "Express"},
    "nouveautes": {"id": 234, "label": "Nouveautes"},
}


async def _scrape_boracay_product(url: str) -> dict:
    """Scrape a single Boracay product page using httpx + BeautifulSoup."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9"
    }
    async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            return None
    soup = BeautifulSoup(resp.text, "html.parser")
    # Title
    h1 = soup.select_one("h1")
    name = h1.get_text(strip=True) if h1 else ""
    if not name:
        return None
    # Reference
    ref_el = soup.select_one("h4")
    ref = ""
    if ref_el:
        ref_text = ref_el.get_text(strip=True)
        if ref_text.startswith("Ref"):
            ref = ref_text.replace("Ref", "").strip().lstrip("_").strip()
    # Image
    image_url = ""
    img_el = soup.select_one(".product-cover img, .images-container img")
    if img_el:
        image_url = img_el.get("src", "") or img_el.get("data-image-large-src", "")
        if image_url and not image_url.startswith("http"):
            image_url = BORACAY_BASE + image_url
    # Description
    desc_section = soup.select_one(".product-description, #description")
    description = desc_section.get_text(strip=True) if desc_section else ""
    # Specs from table rows
    specs = {}
    for row in soup.select(".product-features tr, .data-sheet tr"):
        cells = row.select("td")
        if len(cells) >= 2:
            key = cells[0].get_text(strip=True).rstrip(" :")
            val = cells[1].get_text(strip=True)
            if key and val:
                specs[key] = val
    # Also check dt/dd pairs
    for dt in soup.select("dt, .product-reference"):
        dd = dt.find_next_sibling("dd")
        if dd:
            specs[dt.get_text(strip=True).rstrip(" :")] = dd.get_text(strip=True)
    # Structured spec blocks (Boracay uses bold labels)
    for b in soup.select(".product-features b, .product-features strong"):
        label = b.get_text(strip=True).rstrip(" :")
        next_text = b.next_sibling
        if next_text and isinstance(next_text, str):
            val = next_text.strip()
            if val and label:
                specs[label] = val
    material = specs.get("Matière", specs.get("Matiere", ""))
    dimensions = specs.get("Dimensions", "")
    delivery = specs.get("Délai", specs.get("Delai", ""))
    origin = specs.get("Origine", "")
    min_qty = specs.get("Quantité minimum", specs.get("Quantite minimum", ""))
    marking = specs.get("Type de marquage", "")
    # Category from URL
    url_parts = url.split("/fr/")[-1].split("/") if "/fr/" in url else []
    category = url_parts[0] if url_parts else "divers"
    category_label = BORACAY_CATEGORIES.get(category, {}).get("label", category.replace("-", " ").title())
    return {
        "ref": ref,
        "name": name,
        "description": description,
        "image_url": image_url,
        "category": category_label,
        "source_url": url,
        "brand": "Boracay",
        "material": material,
        "dimensions": dimensions,
        "delivery": delivery,
        "origin": origin,
        "min_quantity": min_qty,
        "marking_type": marking,
        "specs": specs
    }


async def _scrape_boracay_category(category_slug: str, cat_id: int, page: int = 1, limit: int = 24) -> list:
    """Scrape product listings from a Boracay category page."""
    url = f"{BORACAY_BASE}/fr/{cat_id}-{category_slug}?page={page}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9"
    }
    products = []
    async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            return products
    soup = BeautifulSoup(resp.text, "html.parser")
    for article in soup.select(".product-miniature, .js-product-miniature, article"):
        link = article.select_one("a.thumbnail, a.product-thumbnail, h2 a, .product-title a")
        if not link:
            continue
        href = link.get("href", "")
        if not href or ".html" not in href:
            continue
        if not href.startswith("http"):
            href = BORACAY_BASE + href
        title_el = article.select_one("h2, .product-title")
        title = title_el.get_text(strip=True) if title_el else ""
        img_el = article.select_one("img")
        img = ""
        if img_el:
            img = img_el.get("data-full-size-image-url", "") or img_el.get("src", "")
            if img and not img.startswith("http"):
                img = BORACAY_BASE + img
        products.append({"name": title, "url": href, "image_url": img})
        if len(products) >= limit:
            break
    return products


# API Endpoints

@router.get("/provider/import/boracay/categories")
async def get_boracay_categories(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    cats = [{"slug": k, "id": v["id"], "label": v["label"]} for k, v in BORACAY_CATEGORIES.items() if v["id"]]
    return {"categories": cats}


@router.get("/provider/import/boracay/browse/{category_slug}")
async def browse_boracay_category(category_slug: str, page: int = 1, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    cat = BORACAY_CATEGORIES.get(category_slug)
    if not cat or not cat["id"]:
        raise HTTPException(status_code=404, detail="Categorie non trouvee")
    products = await _scrape_boracay_category(category_slug, cat["id"], page)
    return {"products": products, "category": cat["label"], "page": page}


@router.post("/provider/import/boracay/import")
async def import_boracay_product(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    data = await request.json()
    product_url = data.get("url", "").strip()
    if not product_url or "boracay.fr" not in product_url:
        raise HTTPException(status_code=400, detail="URL Boracay invalide")
    # Check duplicate
    existing = await db.provider_products.find_one({
        "provider_id": current_user['user_id'],
        "source_url": product_url
    })
    if existing:
        raise HTTPException(status_code=409, detail="Produit deja importe")
    scraped = await _scrape_boracay_product(product_url)
    if not scraped or not scraped.get("name"):
        raise HTTPException(status_code=404, detail="Impossible de recuperer les informations du produit")
    product_id = f"prod_{uuid.uuid4().hex[:12]}"
    product = {
        "product_id": product_id,
        "provider_id": current_user['user_id'],
        "name": scraped["name"],
        "description": scraped["description"],
        "category": scraped["category"],
        "price": 0,
        "image_url": scraped["image_url"],
        "source_url": scraped["source_url"],
        "brand": "Boracay",
        "boracay_ref": scraped["ref"],
        "material": scraped["material"],
        "dimensions": scraped["dimensions"],
        "delivery": scraped["delivery"],
        "origin": scraped["origin"],
        "min_quantity": scraped["min_quantity"],
        "marking_type": scraped["marking_type"],
        "sizes": [],
        "colors": [],
        "stock": 999,
        "active": True,
        "import_source": "boracay",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.provider_products.insert_one(product)
    del product["_id"]
    return {"product": product, "message": f"Produit '{scraped['name']}' importe avec succes !"}


@router.get("/provider/import/boracay/lookup")
async def lookup_boracay_product(url: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    if not url or "boracay.fr" not in url:
        raise HTTPException(status_code=400, detail="URL Boracay invalide")
    scraped = await _scrape_boracay_product(url)
    if not scraped or not scraped.get("name"):
        raise HTTPException(status_code=404, detail="Produit non trouve")
    return {"product": scraped}
