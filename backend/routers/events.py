from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Optional
from deps import db, get_current_user, get_current_price
from models import EventCreate
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


@router.get("/events")
async def get_events(
    sport_type: Optional[str] = None,
    location: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50)
):
    query = {"status": "active", "published": True}
    if sport_type and sport_type != 'all':
        query["sport_type"] = sport_type
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        query.setdefault("date", {})["$lte"] = date_to
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}}
        ]
    skip = (page - 1) * limit
    total = await db.events.count_documents(query)
    events = await db.events.find(query, {"_id": 0}).sort("date", 1).skip(skip).limit(limit).to_list(limit)
    for event in events:
        event['current_price'] = get_current_price(event)
    return {"events": events, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/events/featured")
async def get_featured_events():
    events = await db.events.find({"status": "active"}, {"_id": 0}).sort("created_at", -1).limit(6).to_list(6)
    for event in events:
        event['current_price'] = get_current_price(event)
    return {"events": events}


@router.get("/events/{event_id}")
async def get_event(event_id: str):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event['current_price'] = get_current_price(event)
    if event.get('races'):
        for race in event['races']:
            race['available_spots'] = race['max_participants'] - race.get('current_participants', 0)
    if event.get('waves'):
        for wave in event['waves']:
            wave['available_spots'] = wave['max_participants'] - wave.get('current_participants', 0)
    return event


@router.post("/events")
async def create_event(event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Only organizers can create events")
    event_id = f"evt_{uuid.uuid4().hex[:12]}"

    races = None
    if event_data.races:
        races = []
        for race in event_data.races:
            race_dict = race.model_dump()
            race_dict['race_id'] = f"race_{uuid.uuid4().hex[:8]}"
            races.append(race_dict)

    waves = None
    if event_data.waves:
        waves = []
        for wave in event_data.waves:
            wave_dict = wave.model_dump()
            wave_dict['wave_id'] = f"wave_{uuid.uuid4().hex[:8]}"
            waves.append(wave_dict)

    custom_fields = None
    if event_data.custom_fields:
        custom_fields = []
        for field in event_data.custom_fields:
            field_dict = field.model_dump()
            field_dict['field_id'] = f"field_{uuid.uuid4().hex[:8]}"
            custom_fields.append(field_dict)

    options = None
    if event_data.options:
        options = []
        for opt in event_data.options:
            opt_dict = opt.model_dump()
            opt_dict['option_id'] = f"opt_{uuid.uuid4().hex[:8]}"
            options.append(opt_dict)

    event_doc = {
        "event_id": event_id,
        "organizer_id": current_user['user_id'],
        "organizer_name": current_user['name'],
        "title": event_data.title,
        "description": event_data.description,
        "sport_type": event_data.sport_type,
        "location": event_data.location,
        "latitude": event_data.latitude,
        "longitude": event_data.longitude,
        "date": event_data.date.isoformat(),
        "end_date": event_data.end_date.isoformat() if event_data.end_date else None,
        "max_participants": event_data.max_participants,
        "price": event_data.price,
        "races": races,
        "waves": waves,
        "pricing_tiers": [t.model_dump() for t in event_data.pricing_tiers] if event_data.pricing_tiers else None,
        "custom_fields": custom_fields,
        "options": options,
        "distances": event_data.distances,
        "elevation_gain": event_data.elevation_gain,
        "image_url": event_data.image_url,
        "route_data": event_data.route_data,
        "route_url": event_data.route_url,
        "exact_address": event_data.exact_address,
        "regulations": event_data.regulations,
        "regulations_pdf_url": event_data.regulations_pdf_url,
        "published": event_data.published,
        "provides_tshirt": event_data.provides_tshirt,
        "provided_items": event_data.provided_items or [],
        "themes": event_data.themes,
        "circuit_type": event_data.circuit_type,
        "has_timer": event_data.has_timer,
        "website_url": event_data.website_url,
        "facebook_url": event_data.facebook_url,
        "instagram_url": event_data.instagram_url,
        "twitter_url": event_data.twitter_url,
        "youtube_url": event_data.youtube_url,
        "requires_pps": event_data.requires_pps,
        "requires_medical_cert": event_data.requires_medical_cert,
        "min_age": event_data.min_age,
        "max_age": event_data.max_age,
        "allows_teams": event_data.allows_teams,
        "team_min_size": event_data.team_min_size,
        "team_max_size": event_data.team_max_size,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "current_participants": 0,
        "status": "active"
    }
    await db.events.insert_one(event_doc)
    if '_id' in event_doc:
        del event_doc['_id']

    # Notify all admins about new event
    from routers.notifications import create_notification
    admins = await db.users.find({"role": "admin"}, {"_id": 0, "user_id": 1}).to_list(50)
    for admin in admins:
        await create_notification(
            admin["user_id"],
            f"Nouvel evenement : \"{event_data.title}\" cree par {current_user['name']}",
            "new_event",
            {"event_id": event_id, "organizer_name": current_user['name']}
        )

    return event_doc


@router.put("/events/{event_id}")
async def update_event(event_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event['organizer_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    data = await request.json()
    await db.events.update_one({"event_id": event_id}, {"$set": data})
    return {"message": "Event updated"}


@router.put("/events/{event_id}/publish")
async def toggle_publish_event(event_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event['organizer_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    data = await request.json()
    published = data.get("published", False)
    await db.events.update_one({"event_id": event_id}, {"$set": {"published": published}})

    if published:
        from routers.notifications import create_notification
        await create_notification(
            event['organizer_id'],
            f"Votre evenement \"{event['title']}\" est maintenant publie et visible par tous !",
            "event_published",
            {"event_id": event_id}
        )

    return {"message": f"Evenement {'publie' if published else 'depublie'}", "published": published}


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event['organizer_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.events.update_one({"event_id": event_id}, {"$set": {"status": "cancelled"}})
    return {"message": "Event cancelled"}


@router.get("/organizer/events")
async def get_organizer_events(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    events = await db.events.find({"organizer_id": current_user['user_id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"events": events}


# ============== PROMO CODES ==============

@router.post("/promo-codes")
async def create_promo_code(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    data = await request.json()
    promo_doc = {
        "promo_id": f"promo_{uuid.uuid4().hex[:8]}",
        "code": data['code'].upper(),
        "discount_type": data.get('discount_type', 'percentage'),
        "discount_value": data['discount_value'],
        "max_uses": data.get('max_uses'),
        "current_uses": 0,
        "valid_from": data.get('valid_from'),
        "valid_until": data.get('valid_until'),
        "event_id": data.get('event_id'),
        "organizer_id": current_user['user_id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.promo_codes.insert_one(promo_doc)
    return {"message": "Promo code created", "code": promo_doc['code']}


@router.post("/promo-codes/validate")
async def validate_promo_code(request: Request):
    data = await request.json()
    code = data.get('code', '').upper()
    event_id = data.get('event_id')
    promo = await db.promo_codes.find_one({
        "code": code,
        "$or": [{"event_id": event_id}, {"event_id": None}]
    }, {"_id": 0})
    if not promo:
        raise HTTPException(status_code=404, detail="Code promo invalide")
    if promo.get('max_uses') and promo['current_uses'] >= promo['max_uses']:
        raise HTTPException(status_code=400, detail="Code promo epuise")
    now = datetime.now(timezone.utc).isoformat()
    if promo.get('valid_from') and now < promo['valid_from']:
        raise HTTPException(status_code=400, detail="Code promo pas encore valide")
    if promo.get('valid_until') and now > promo['valid_until']:
        raise HTTPException(status_code=400, detail="Code promo expire")
    return {"valid": True, "discount_type": promo['discount_type'], "discount_value": promo['discount_value']}


# ============== CATEGORIES ==============

@router.get("/categories")
async def get_categories():
    categories = [
        {"id": "cycling", "name": "Cyclisme", "icon": "bike", "count": 0},
        {"id": "triathlon", "name": "Triathlon", "icon": "medal", "count": 0},
        {"id": "running", "name": "Course a pied", "icon": "footprints", "count": 0},
        {"id": "walking", "name": "Marche", "icon": "walking", "count": 0},
        {"id": "motorsport", "name": "Sports Mecaniques", "icon": "car", "count": 0},
        {"id": "rallye", "name": "Rallye Voitures", "icon": "car", "count": 0},
        {"id": "vtt", "name": "VTT", "icon": "mountain", "count": 0},
        {"id": "bmx", "name": "BMX", "icon": "bike", "count": 0},
        {"id": "cyclocross", "name": "Cyclo-cross", "icon": "bike", "count": 0},
        {"id": "racquet", "name": "Sports de raquette", "icon": "target", "count": 0},
        {"id": "archery", "name": "Tir a l'arc", "icon": "target", "count": 0},
        {"id": "kitesurf", "name": "Kitesurf", "icon": "wind", "count": 0},
        {"id": "golf", "name": "Golf", "icon": "flag", "count": 0},
        {"id": "petanque", "name": "Petanque", "icon": "circle", "count": 0},
        {"id": "billard", "name": "Billard", "icon": "circle", "count": 0},
        {"id": "bowling", "name": "Bowling", "icon": "circle", "count": 0},
        {"id": "crossfit", "name": "CrossFit", "icon": "dumbbell", "count": 0},
        {"id": "combat", "name": "Sports de combat", "icon": "swords", "count": 0}
    ]
    for cat in categories:
        cat['count'] = await db.events.count_documents({"sport_type": cat['id'], "status": "active"})
    return {"categories": categories}
