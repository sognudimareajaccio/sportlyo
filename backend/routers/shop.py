from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from deps import db, get_current_user
import uuid
import os
import httpx
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.get("/organizer/products")
async def get_organizer_products(current_user: dict = Depends(get_current_user), event_id: Optional[str] = None):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    query = {"organizer_id": current_user['user_id']}
    if event_id:
        query["event_id"] = event_id
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"products": products}


@router.post("/organizer/products")
async def create_product(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    if not data.get("name") or not data.get("price"):
        raise HTTPException(status_code=400, detail="Nom et prix requis")
    product = {
        "product_id": f"prod_{uuid.uuid4().hex[:12]}",
        "organizer_id": current_user['user_id'],
        "event_id": data.get("event_id", ""),
        "name": data.get("name"), "description": data.get("description", ""),
        "category": data.get("category", "Textile"),
        "price": float(data.get("price", 0)),
        "organizer_commission": float(data.get("organizer_commission", 5)),
        "image_url": data.get("image_url", ""),
        "sizes": data.get("sizes", []), "colors": data.get("colors", []),
        "stock": int(data.get("stock", 100)), "sold": 0, "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product)
    del product["_id"]
    return {"product": product}


@router.put("/organizer/products/{product_id}")
async def update_product(product_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    fields = {}
    for f in ["name", "description", "category", "price", "organizer_commission", "image_url", "sizes", "colors", "stock", "active", "event_id"]:
        if f in data:
            fields[f] = data[f]
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.products.update_one({"product_id": product_id, "organizer_id": current_user['user_id']}, {"$set": fields})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouve")
    updated = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    return {"product": updated}


@router.delete("/organizer/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    result = await db.products.delete_one({"product_id": product_id, "organizer_id": current_user['user_id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouve")
    return {"message": "Produit supprime"}


@router.get("/events/{event_id}/shop")
async def get_event_shop(event_id: str):
    products = await db.products.find({"event_id": event_id, "active": True}, {"_id": 0}).to_list(100)
    return {"products": products}


@router.post("/shop/order")
async def create_shop_order(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    items = data.get("items", [])
    if not items:
        raise HTTPException(status_code=400, detail="Panier vide")

    order_items = []
    total = 0
    total_commission = 0
    organizer_id = None
    provider_ids = set()
    for item in items:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if not product:
            continue
        qty = int(item.get("quantity", 1))
        line_total = product["price"] * qty
        commission = product.get("organizer_commission", 5) * qty
        total += line_total
        total_commission += commission
        organizer_id = product.get("organizer_id")
        if product.get("provider_id"):
            provider_ids.add(product["provider_id"])
        order_items.append({
            "product_id": product["product_id"], "product_name": product["name"],
            "price": product["price"], "quantity": qty,
            "size": item.get("size", ""), "color": item.get("color", ""),
            "line_total": line_total, "commission": commission,
            "provider_id": product.get("provider_id")
        })
        await db.products.update_one({"product_id": product["product_id"]}, {"$inc": {"sold": qty, "stock": -qty}})
    provider_id = list(provider_ids)[0] if len(provider_ids) == 1 else None

    delivery_fee = float(data.get("delivery_fee", 0))
    grand_total = total + delivery_fee
    order_id = f"ord_{uuid.uuid4().hex[:12]}"

    sumup_key = os.environ.get("SUMUP_API_KEY", "")
    sumup_merchant = os.environ.get("SUMUP_MERCHANT_CODE", "")
    checkout_url = None
    payment_status = "simulated"

    if sumup_key and sumup_merchant:
        try:
            async with httpx.AsyncClient() as client_http:
                checkout_res = await client_http.post(
                    "https://api.sumup.com/v0.1/checkouts",
                    headers={"Authorization": f"Bearer {sumup_key}", "Content-Type": "application/json"},
                    json={
                        "checkout_reference": order_id, "amount": grand_total,
                        "currency": "EUR", "merchant_code": sumup_merchant,
                        "description": f"Commande {order_id}",
                        "return_url": f"{os.environ.get('FRONTEND_URL', '')}/events/{data.get('event_id', '')}/shop?order={order_id}&status=success"
                    }
                )
                if checkout_res.status_code == 201:
                    checkout_data = checkout_res.json()
                    checkout_url = f"https://api.sumup.com/v0.1/checkouts/{checkout_data.get('id')}"
                    payment_status = "pending"
                else:
                    logger.warning(f"SumUp checkout failed: {checkout_res.status_code} {checkout_res.text}")
        except Exception as e:
            logger.warning(f"SumUp error: {e}")

    order = {
        "order_id": order_id, "user_id": current_user["user_id"],
        "user_name": current_user["name"], "user_email": current_user.get("email", ""),
        "organizer_id": organizer_id, "provider_id": provider_id,
        "provider_ids": list(provider_ids),
        "event_id": data.get("event_id", ""), "items": order_items,
        "total": grand_total, "subtotal": total, "delivery_fee": delivery_fee,
        "organizer_commission_total": total_commission,
        "payment_status": payment_status,
        "payment_method": "SumUp" if sumup_key else "Simulation",
        "checkout_url": checkout_url,
        "delivery_method": data.get("delivery_method", "Retrait sur place"),
        "shipping_address": data.get("shipping_address", ""),
        "phone": data.get("phone", ""), "notes": data.get("notes", ""),
        "status": "confirmee", "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order)
    del order["_id"]

    # Auto-generate invoice
    invoice_number = f"INV-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
    inv_items = []
    for item in order_items:
        inv_items.append({
            "description": f"{item.get('product_name', '')} {('Taille: ' + item.get('size', '')) if item.get('size') else ''} x{item.get('quantity', 1)}",
            "quantity": item.get("quantity", 1),
            "unit_price": item.get("unit_price", 0),
            "total": item.get("line_total", 0)
        })
    if delivery_fee > 0:
        inv_items.append({"description": "Frais de livraison", "quantity": 1, "unit_price": delivery_fee, "total": delivery_fee})
    invoice = {
        "invoice_id": f"inv_{uuid.uuid4().hex[:12]}",
        "invoice_number": invoice_number,
        "source_type": "order", "source_id": order["order_id"],
        "user_id": current_user['user_id'], "user_name": current_user['name'],
        "user_email": current_user.get('email', ''),
        "organizer_id": organizer_id, "items": inv_items,
        "subtotal": total, "delivery_fee": delivery_fee, "total": grand_total,
        "delivery_method": data.get("delivery_method", ""),
        "status": "paid", "payment_date": order["created_at"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(invoice)

    return {"order": order, "invoice_id": invoice.get("invoice_id"), "checkout_url": checkout_url,
            "message": f"Commande {order['order_id']} confirmee - {grand_total:.2f}EUR"}


@router.get("/organizer/orders")
async def get_organizer_orders(current_user: dict = Depends(get_current_user), event_id: Optional[str] = None):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    query = {"organizer_id": current_user['user_id']}
    if event_id:
        query["event_id"] = event_id
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"orders": orders}


@router.get("/organizer/shop-stats")
async def get_shop_stats(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    products = await db.products.find({"organizer_id": current_user['user_id']}, {"_id": 0}).to_list(500)
    orders = await db.orders.find({"organizer_id": current_user['user_id']}, {"_id": 0}).to_list(5000)
    total_sales = sum(o.get("total", 0) for o in orders)
    total_commission = sum(o.get("organizer_commission_total", 0) for o in orders)
    return {
        "total_sales": total_sales, "total_commission": total_commission,
        "total_products": len(products), "total_orders": len(orders),
        "total_items_sold": sum(p.get("sold", 0) for p in products)
    }


# ============== INVOICING ==============

@router.get("/invoices")
async def get_invoices(current_user: dict = Depends(get_current_user)):
    if current_user['role'] == 'participant':
        invoices = await db.invoices.find({"user_id": current_user['user_id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    elif current_user['role'] in ['organizer', 'admin']:
        invoices = await db.invoices.find({"organizer_id": current_user['user_id']}, {"_id": 0}).sort("created_at", -1).to_list(500)
    else:
        invoices = []
    return {"invoices": invoices}


@router.get("/invoices/{invoice_id}")
async def get_invoice_detail(invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvee")
    if current_user['role'] == 'participant' and invoice.get('user_id') != current_user['user_id']:
        raise HTTPException(status_code=403, detail="Acces non autorise")
    return {"invoice": invoice}


@router.post("/invoices/generate")
async def generate_invoice(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    source_type = data.get("type", "registration")
    source_id = data.get("source_id")
    if not source_id:
        raise HTTPException(status_code=400, detail="source_id requis")

    existing = await db.invoices.find_one({"source_id": source_id, "source_type": source_type}, {"_id": 0})
    if existing:
        return {"invoice": existing, "message": "Facture deja existante"}

    invoice_number = f"INV-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    if source_type == "registration":
        reg = await db.registrations.find_one({"registration_id": source_id}, {"_id": 0})
        if not reg:
            raise HTTPException(status_code=404, detail="Inscription non trouvee")
        event = await db.events.find_one({"event_id": reg.get("event_id")}, {"_id": 0})
        items = [{"description": f"Inscription - {event.get('title', '')} - {reg.get('race_name', '')}", "quantity": 1, "unit_price": reg.get("amount_paid", 0), "total": reg.get("amount_paid", 0)}]
        subtotal = reg.get("amount_paid", 0)
        invoice = {
            "invoice_id": f"inv_{uuid.uuid4().hex[:12]}", "invoice_number": invoice_number,
            "source_type": "registration", "source_id": source_id,
            "user_id": reg.get("user_id"), "user_name": reg.get("full_name", ""),
            "user_email": reg.get("email", ""), "organizer_id": event.get("organizer_id", ""),
            "event_title": event.get("title", ""), "items": items,
            "subtotal": subtotal, "tax_rate": 0, "tax_amount": 0, "total": subtotal,
            "status": "paid", "payment_date": reg.get("created_at", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    elif source_type == "order":
        order = await db.orders.find_one({"order_id": source_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Commande non trouvee")
        items = []
        for item in order.get("items", []):
            items.append({
                "description": f"{item.get('product_name', '')} {('Taille: ' + item.get('size', '')) if item.get('size') else ''} x{item.get('quantity', 1)}",
                "quantity": item.get("quantity", 1), "unit_price": item.get("unit_price", 0), "total": item.get("line_total", 0)
            })
        if order.get("delivery_fee", 0) > 0:
            items.append({"description": "Frais de livraison", "quantity": 1, "unit_price": order["delivery_fee"], "total": order["delivery_fee"]})
        invoice = {
            "invoice_id": f"inv_{uuid.uuid4().hex[:12]}", "invoice_number": invoice_number,
            "source_type": "order", "source_id": source_id,
            "user_id": order.get("user_id"), "user_name": order.get("user_name", ""),
            "user_email": order.get("user_email", ""), "organizer_id": order.get("organizer_id", ""),
            "items": items, "subtotal": order.get("subtotal", order.get("total", 0)),
            "delivery_fee": order.get("delivery_fee", 0), "tax_rate": 0, "tax_amount": 0,
            "total": order.get("total", 0), "delivery_method": order.get("delivery_method", ""),
            "shipping_address": order.get("shipping_address", ""),
            "status": "paid", "payment_date": order.get("created_at", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    else:
        raise HTTPException(status_code=400, detail="Type de facture invalide")

    await db.invoices.insert_one(invoice)
    del invoice["_id"]
    return {"invoice": invoice}
