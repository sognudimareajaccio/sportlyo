from fastapi import APIRouter, HTTPException, Depends, Request, Query
from deps import db, get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


# ============== RFID EQUIPMENT CATALOG ==============

@router.get("/rfid/equipment")
async def list_rfid_equipment(category: str = None):
    """List available RFID equipment for rental."""
    query = {}
    if category:
        query["category"] = category
    equipment = await db.rfid_equipment.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    return {"equipment": equipment}


@router.post("/rfid/equipment")
async def create_rfid_equipment(request: Request, current_user: dict = Depends(get_current_user)):
    """Admin: create RFID equipment entry."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    data = await request.json()
    equip = {
        "equipment_id": f"rfid_{uuid.uuid4().hex[:12]}",
        "name": data.get("name", ""),
        "description": data.get("description", ""),
        "category": data.get("category", "chronometrage"),
        "daily_rate": float(data.get("daily_rate", 0)),
        "quantity_total": int(data.get("quantity_total", 1)),
        "quantity_available": int(data.get("quantity_total", 1)),
        "image_url": data.get("image_url", ""),
        "specs": data.get("specs", {}),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.rfid_equipment.insert_one(equip)
    del equip["_id"]
    return {"equipment": equip}


@router.put("/rfid/equipment/{equipment_id}")
async def update_rfid_equipment(equipment_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Admin: update RFID equipment."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    data = await request.json()
    update = {}
    for field in ["name", "description", "category", "daily_rate", "quantity_total", "image_url", "specs"]:
        if field in data:
            update[field] = data[field]
    if update:
        await db.rfid_equipment.update_one({"equipment_id": equipment_id}, {"$set": update})
    equip = await db.rfid_equipment.find_one({"equipment_id": equipment_id}, {"_id": 0})
    return {"equipment": equip}


@router.delete("/rfid/equipment/{equipment_id}")
async def delete_rfid_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: delete RFID equipment."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    await db.rfid_equipment.delete_one({"equipment_id": equipment_id})
    return {"message": "Equipement supprime"}


# ============== RFID RENTAL REQUESTS ==============

@router.post("/rfid/rentals")
async def create_rental_request(request: Request, current_user: dict = Depends(get_current_user)):
    """Organizer: request RFID equipment rental."""
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    items = data.get("items", [])
    event_id = data.get("event_id", "")
    start_date = data.get("start_date", "")
    end_date = data.get("end_date", "")
    if not items or not event_id:
        raise HTTPException(status_code=400, detail="Items et event_id requis")

    # Calculate total
    total = 0
    rental_items = []
    for item in items:
        equip = await db.rfid_equipment.find_one({"equipment_id": item.get("equipment_id")}, {"_id": 0})
        if not equip:
            continue
        qty = int(item.get("quantity", 1))
        days = int(item.get("days", 1))
        line_total = equip["daily_rate"] * qty * days
        total += line_total
        rental_items.append({
            "equipment_id": equip["equipment_id"],
            "name": equip["name"],
            "quantity": qty,
            "days": days,
            "daily_rate": equip["daily_rate"],
            "line_total": line_total
        })

    event = await db.events.find_one({"event_id": event_id}, {"_id": 0, "title": 1})
    rental = {
        "rental_id": f"rent_{uuid.uuid4().hex[:12]}",
        "organizer_id": current_user["user_id"],
        "organizer_name": current_user.get("company_name") or current_user["name"],
        "event_id": event_id,
        "event_title": event.get("title", "") if event else "",
        "items": rental_items,
        "start_date": start_date,
        "end_date": end_date,
        "total": round(total, 2),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.rfid_rentals.insert_one(rental)
    del rental["_id"]

    # Notify admin
    from routers.notifications import create_notification
    admin_users = await db.users.find({"role": "admin"}, {"_id": 0, "user_id": 1}).to_list(10)
    for admin in admin_users:
        await create_notification(
            admin["user_id"], "rfid_rental",
            "Demande de location RFID",
            f"{current_user['name']} demande du materiel RFID pour {event.get('title', '') if event else 'un evenement'}",
            "/admin"
        )

    return {"rental": rental}


@router.get("/rfid/rentals/my")
async def get_my_rentals(current_user: dict = Depends(get_current_user)):
    """Get organizer's rental requests."""
    rentals = await db.rfid_rentals.find(
        {"organizer_id": current_user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"rentals": rentals}


@router.get("/admin/rfid/rentals")
async def get_all_rentals(current_user: dict = Depends(get_current_user)):
    """Admin: get all rental requests."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    rentals = await db.rfid_rentals.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"rentals": rentals}


@router.put("/admin/rfid/rentals/{rental_id}/process")
async def process_rental(rental_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Admin: approve or reject a rental request."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    data = await request.json()
    status = data.get("status")
    if status not in ["confirmed", "rejected", "returned"]:
        raise HTTPException(status_code=400, detail="Statut invalide")

    rental = await db.rfid_rentals.find_one({"rental_id": rental_id}, {"_id": 0})
    if not rental:
        raise HTTPException(status_code=404, detail="Location non trouvee")

    await db.rfid_rentals.update_one(
        {"rental_id": rental_id},
        {"$set": {"status": status, "processed_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Notify organizer
    from routers.notifications import create_notification
    msg = "Votre demande de location RFID a ete " + ("confirmee" if status == "confirmed" else "refusee" if status == "rejected" else "marquee comme retournee")
    await create_notification(
        rental["organizer_id"], "rfid_rental_update",
        f"Location RFID {status}",
        msg, "/organizer"
    )

    return {"message": f"Location {status}"}
