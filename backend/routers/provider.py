from fastapi import APIRouter, HTTPException, Depends, Request
from deps import db, get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")

@router.get("/provider/organizers")
async def get_organizers_for_provider(current_user: dict = Depends(get_current_user)):
    """Provider: list all active organizers to start conversations"""
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    organizers = await db.users.find(
        {"role": "organizer"},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "company_name": 1}
    ).to_list(100)
    return {"organizers": organizers}


@router.get("/provider/catalog")
async def get_provider_catalog(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    products = await db.provider_products.find({"provider_id": current_user['user_id']}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"products": products}

@router.post("/provider/catalog")
async def create_provider_product(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    data = await request.json()
    if not data.get("name") or not data.get("price"):
        raise HTTPException(status_code=400, detail="Nom et prix requis")
    product = {
        "product_id": f"pprod_{uuid.uuid4().hex[:12]}",
        "provider_id": current_user['user_id'],
        "provider_name": current_user.get('company_name') or current_user['name'],
        "name": data.get("name"),
        "description": data.get("description", ""),
        "category": data.get("category", "Textile"),
        "price": float(data.get("price", 0)),
        "suggested_commission": float(data.get("suggested_commission", 5)),
        "image_url": data.get("image_url", ""),
        "images": data.get("images", []),
        "sizes": data.get("sizes", []),
        "colors": data.get("colors", []),
        "stock": int(data.get("stock", 100)),
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.provider_products.insert_one(product)
    del product["_id"]
    return {"product": product}

@router.put("/provider/catalog/{product_id}")
async def update_provider_product(product_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    data = await request.json()
    fields = {}
    for f in ["name","description","category","price","suggested_commission","image_url","images","sizes","colors","stock","active"]:
        if f in data:
            fields[f] = data[f]
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.provider_products.update_one({"product_id": product_id, "provider_id": current_user['user_id']}, {"$set": fields})
    updated = await db.provider_products.find_one({"product_id": product_id}, {"_id": 0})
    return {"product": updated}

@router.delete("/provider/catalog/{product_id}")
async def delete_provider_product(product_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    await db.provider_products.delete_one({"product_id": product_id, "provider_id": current_user['user_id']})
    return {"message": "Produit supprimé"}

@router.get("/provider/orders")
async def get_provider_orders(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    orders = await db.orders.find(
        {"$or": [{"provider_id": current_user['user_id']}, {"provider_ids": current_user['user_id']}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return {"orders": orders}

@router.get("/provider/stats")
async def get_provider_stats(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    products = await db.provider_products.find({"provider_id": current_user['user_id']}, {"_id": 0}).to_list(500)
    orders = await db.orders.find(
        {"$or": [{"provider_id": current_user['user_id']}, {"provider_ids": current_user['user_id']}]},
        {"_id": 0}
    ).to_list(5000)
    total_sales = sum(o.get("total", 0) for o in orders)
    total_commission_given = sum(o.get("organizer_commission_total", 0) for o in orders)
    return {
        "total_products": len(products),
        "total_orders": len(orders),
        "total_sales": total_sales,
        "total_commission_given": total_commission_given,
        "net_revenue": total_sales - total_commission_given
    }


@router.get("/provider/financial-breakdown")
async def get_provider_financial_breakdown(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    orders = await db.orders.find(
        {"$or": [{"provider_id": current_user['user_id']}, {"provider_ids": current_user['user_id']}]},
        {"_id": 0}
    ).to_list(5000)

    by_organizer = {}
    for o in orders:
        org_id = o.get("organizer_id", "unknown")
        if org_id not in by_organizer:
            by_organizer[org_id] = {"organizer_id": org_id, "name": "", "orders_count": 0, "total_sales": 0, "total_commission": 0}
        by_organizer[org_id]["orders_count"] += 1
        by_organizer[org_id]["total_sales"] += o.get("total", 0)
        by_organizer[org_id]["total_commission"] += o.get("organizer_commission_total", 0)

    for org_id, info in by_organizer.items():
        org = await db.users.find_one({"user_id": org_id}, {"_id": 0, "name": 1, "company_name": 1})
        if org:
            info["name"] = org.get("company_name") or org.get("name", "")
        info["net_revenue"] = round(info["total_sales"] - info["total_commission"], 2)
        info["total_sales"] = round(info["total_sales"], 2)
        info["total_commission"] = round(info["total_commission"], 2)

    total_sales = sum(v["total_sales"] for v in by_organizer.values())
    total_commission = sum(v["total_commission"] for v in by_organizer.values())

    return {
        "by_organizer": list(by_organizer.values()),
        "total_sales": round(total_sales, 2),
        "total_commission": round(total_commission, 2),
        "net_revenue": round(total_sales - total_commission, 2)
    }


@router.get("/provider/sales-breakdown")
async def get_provider_sales_breakdown(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    orders = await db.orders.find(
        {"$or": [{"provider_id": current_user['user_id']}, {"provider_ids": current_user['user_id']}]},
        {"_id": 0}
    ).to_list(5000)

    by_product = {}
    by_category = {}
    by_size = {}
    for o in orders:
        for item in o.get("items", []):
            pid = item.get("product_id", "unknown")
            pname = item.get("product_name", "Produit")
            qty = item.get("quantity", 1)
            revenue = item.get("line_total", 0)

            if pid not in by_product:
                by_product[pid] = {"product_id": pid, "name": pname, "quantity": 0, "revenue": 0}
            by_product[pid]["quantity"] += qty
            by_product[pid]["revenue"] += revenue

            cat = "Autre"
            pp = await db.products.find_one({"product_id": pid}, {"_id": 0, "category": 1})
            if pp:
                cat = pp.get("category", "Autre")
            by_category[cat] = by_category.get(cat, 0) + qty

            size = item.get("size", "")
            if size:
                by_size[size] = by_size.get(size, 0) + qty

    top_products = sorted(by_product.values(), key=lambda x: x["quantity"], reverse=True)[:10]
    for p in top_products:
        p["revenue"] = round(p["revenue"], 2)

    return {
        "top_products": top_products,
        "by_category": [{"name": k, "value": v} for k, v in sorted(by_category.items(), key=lambda x: x[1], reverse=True)],
        "by_size": [{"name": k, "value": v} for k, v in sorted(by_size.items(), key=lambda x: x[1], reverse=True)]
    }

@router.get("/providers/catalog")
async def browse_provider_catalogs(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    products = await db.provider_products.find({"active": True}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"products": products}

@router.get("/providers/list")
async def list_providers(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Accès requis")
    providers = await db.users.find({"role": "provider", "status": "active"}, {"_id": 0, "password": 0}).to_list(100)
    return {"providers": providers}

@router.post("/organizer/add-provider-product")
async def add_provider_product_to_event(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    provider_product_id = data.get("provider_product_id")
    event_id = data.get("event_id")
    commission = float(data.get("organizer_commission", 5))
    if not provider_product_id or not event_id:
        raise HTTPException(status_code=400, detail="product_id et event_id requis")
    pp = await db.provider_products.find_one({"product_id": provider_product_id}, {"_id": 0})
    if not pp:
        raise HTTPException(status_code=404, detail="Produit prestataire non trouvé")
    product = {
        "product_id": f"prod_{uuid.uuid4().hex[:12]}",
        "source": "provider",
        "provider_product_id": provider_product_id,
        "provider_id": pp["provider_id"],
        "provider_name": pp.get("provider_name", ""),
        "organizer_id": current_user['user_id'],
        "event_id": event_id,
        "name": pp["name"],
        "description": pp.get("description", ""),
        "category": pp.get("category", "Textile"),
        "price": pp["price"],
        "organizer_commission": commission,
        "image_url": pp.get("image_url", ""),
        "sizes": pp.get("sizes", []),
        "colors": pp.get("colors", []),
        "stock": pp.get("stock", 100),
        "sold": 0,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product)
    del product["_id"]
    return {"product": product}

@router.post("/provider/messages")
async def send_provider_message(request: Request, current_user: dict = Depends(get_current_user)):
    from routers.notifications import create_notification
    data = await request.json()
    recipient_id = data.get("recipient_id")
    content = data.get("content")
    if not recipient_id or not content:
        raise HTTPException(status_code=400, detail="recipient_id et content requis")
    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "sender_id": current_user['user_id'],
        "sender_name": current_user.get('company_name') or current_user['name'],
        "sender_role": current_user['role'],
        "recipient_id": recipient_id,
        "content": content,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.provider_messages.insert_one(msg)
    del msg["_id"]
    sender_name = current_user.get('company_name') or current_user['name']
    await create_notification(
        recipient_id, "message",
        f"Nouveau message de {sender_name}",
        content[:100],
        "/dashboard" if current_user['role'] == 'provider' else "/provider"
    )
    return {"message": msg}

@router.get("/provider/messages/{other_id}")
async def get_provider_messages(other_id: str, current_user: dict = Depends(get_current_user)):
    query = {"$or": [
        {"sender_id": current_user['user_id'], "recipient_id": other_id},
        {"sender_id": other_id, "recipient_id": current_user['user_id']}
    ]}
    messages = await db.provider_messages.find(query, {"_id": 0}).sort("created_at", 1).to_list(500)
    await db.provider_messages.update_many(
        {"sender_id": other_id, "recipient_id": current_user['user_id'], "read": False},
        {"$set": {"read": True}}
    )
    return {"messages": messages}

@router.get("/provider/conversations")
async def get_provider_conversations(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"$or": [{"sender_id": current_user['user_id']}, {"recipient_id": current_user['user_id']}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": {"$cond": [{"$eq": ["$sender_id", current_user['user_id']]}, "$recipient_id", "$sender_id"]},
            "last_message": {"$first": "$content"},
            "last_date": {"$first": "$created_at"},
            "last_sender": {"$first": "$sender_name"},
            "unread": {"$sum": {"$cond": [{"$and": [{"$ne": ["$sender_id", current_user['user_id']]}, {"$eq": ["$read", False]}]}, 1, 0]}}
        }}
    ]
    convos = await db.provider_messages.aggregate(pipeline).to_list(100)
    result = []
    for c in convos:
        other_user = await db.users.find_one({"user_id": c["_id"]}, {"_id": 0, "password": 0})
        if other_user:
            result.append({
                "user_id": c["_id"],
                "name": other_user.get("company_name") or other_user.get("name"),
                "role": other_user.get("role"),
                "last_message": c["last_message"],
                "last_date": c["last_date"],
                "unread": c["unread"]
            })
    return {"conversations": result}

@router.put("/admin/providers/{user_id}/status")
async def update_provider_status(user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    data = await request.json()
    new_status = data.get("status")
    if new_status not in ["active", "rejected"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    await db.users.update_one({"user_id": user_id, "role": "provider"}, {"$set": {"status": new_status}})
    return {"message": f"Prestataire {'validé' if new_status == 'active' else 'refusé'}"}

@router.get("/admin/providers")
async def get_providers(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    providers = await db.users.find({"role": "provider"}, {"_id": 0, "password": 0}).to_list(100)
    return {"providers": providers}
