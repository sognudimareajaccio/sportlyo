from fastapi import APIRouter, HTTPException, Depends, Request
from deps import db, get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


@router.get("/participant/profile")
async def get_participant_profile(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"profile": user}


@router.put("/participant/profile")
async def update_participant_profile(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    allowed = ["name", "phone", "birth_date", "gender", "city", "postal_code", "country", "emergency_contact", "emergency_phone", "club_name"]
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour")
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"user_id": current_user["user_id"]}, {"$set": fields})
    updated = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0, "password": 0})
    return {"profile": updated}


@router.get("/participant/orders")
async def get_participant_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    for order in orders:
        if order.get("event_id"):
            event = await db.events.find_one({"event_id": order["event_id"]}, {"_id": 0, "title": 1, "date": 1, "location": 1})
            order["event"] = event
    return {"orders": orders}


@router.get("/participant/upcoming")
async def get_participant_upcoming(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    registrations = await db.registrations.find(
        {"user_id": current_user["user_id"], "status": "confirmed"}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    upcoming = []
    for reg in registrations:
        event = await db.events.find_one({"event_id": reg["event_id"]}, {"_id": 0})
        if event:
            reg["event"] = event
            try:
                event_date = event.get("date", "")
                if event_date and event_date > now:
                    upcoming.append(reg)
            except (TypeError, ValueError):
                upcoming.append(reg)
    return {"upcoming": upcoming}


@router.get("/participant/new-events")
async def get_new_published_events(current_user: dict = Depends(get_current_user)):
    """Return recently published events for 'Nouveau Defi' widget."""
    now = datetime.now(timezone.utc).isoformat()
    events = await db.events.find(
        {"status": "active", "published": True, "date": {"$gte": now}},
        {"_id": 0}
    ).sort("created_at", -1).limit(6).to_list(6)
    return {"events": events}



@router.get("/participant/results")
async def get_participant_results(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    registrations = await db.registrations.find(
        {"user_id": current_user["user_id"], "status": "confirmed"}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    results = []
    for reg in registrations:
        event = await db.events.find_one({"event_id": reg["event_id"]}, {"_id": 0})
        if event:
            reg["event"] = event
            event_date = event.get("date", "")
            try:
                if event_date and event_date <= now:
                    results.append(reg)
            except (TypeError, ValueError):
                results.append(reg)
    return {"results": results}


@router.get("/participant/stats")
async def get_participant_annual_stats(current_user: dict = Depends(get_current_user)):
    current_year = datetime.now(timezone.utc).year
    registrations = await db.registrations.find(
        {"user_id": current_user["user_id"], "status": "confirmed"}, {"_id": 0}
    ).to_list(500)

    all_time_count = len(registrations)
    year_count = 0
    total_km = 0
    total_elevation = 0
    total_spent = 0
    sports = {}
    monthly = {str(m): 0 for m in range(1, 13)}

    for reg in registrations:
        event = await db.events.find_one({"event_id": reg["event_id"]}, {"_id": 0})
        if not event:
            continue

        created = reg.get("created_at", "")
        try:
            reg_year = int(created[:4]) if created else 0
        except (ValueError, TypeError):
            reg_year = 0

        if reg_year == current_year:
            year_count += 1
            try:
                month = str(int(created[5:7]))
                monthly[month] = monthly.get(month, 0) + 1
            except (ValueError, TypeError):
                pass

        sport = event.get("sport_type", "other")
        sports[sport] = sports.get(sport, 0) + 1

        distance = reg.get("selected_distance") or reg.get("selected_race", "")
        if distance:
            try:
                km = float("".join(c for c in str(distance) if c.isdigit() or c == ".") or "0")
                total_km += km
            except (ValueError, TypeError):
                pass

        if event.get("elevation_gain"):
            try:
                total_elevation += int(event["elevation_gain"])
            except (ValueError, TypeError):
                pass

        total_spent += reg.get("amount_paid", 0) or 0

    orders = await db.orders.find({"user_id": current_user["user_id"]}, {"_id": 0}).to_list(500)
    orders_count = len(orders)
    orders_total = sum(o.get("total", 0) for o in orders)

    return {
        "year": current_year,
        "all_time_races": all_time_count,
        "year_races": year_count,
        "total_km": round(total_km, 1),
        "total_elevation": total_elevation,
        "total_spent_registrations": round(total_spent, 2),
        "sports_breakdown": sports,
        "monthly_registrations": monthly,
        "orders_count": orders_count,
        "orders_total": round(orders_total, 2)
    }


@router.get("/participant/providers")
async def get_participant_providers(current_user: dict = Depends(get_current_user)):
    """List providers the participant has ordered from or messaged."""
    orders = await db.orders.find(
        {"user_id": current_user["user_id"], "provider_id": {"$exists": True, "$ne": None}},
        {"_id": 0, "provider_id": 1}
    ).to_list(500)
    provider_ids = list(set(o["provider_id"] for o in orders if o.get("provider_id")))

    msgs = await db.provider_messages.find(
        {"$or": [{"sender_id": current_user["user_id"]}, {"recipient_id": current_user["user_id"]}]},
        {"_id": 0, "sender_id": 1, "recipient_id": 1}
    ).to_list(500)
    for m in msgs:
        other = m["recipient_id"] if m["sender_id"] == current_user["user_id"] else m["sender_id"]
        if other not in provider_ids:
            provider_ids.append(other)

    providers = []
    for pid in provider_ids:
        u = await db.users.find_one({"user_id": pid, "role": "provider"}, {"_id": 0, "password": 0})
        if u:
            providers.append({
                "user_id": u["user_id"],
                "name": u.get("company_name") or u.get("name", ""),
                "email": u.get("email", "")
            })
    return {"providers": providers}
