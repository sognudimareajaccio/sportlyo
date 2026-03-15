from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from typing import Optional
from deps import db, get_current_user, generate_bib_number, generate_rfid_chip_id, calculate_category, generate_qr_code
import uuid
import csv
from io import BytesIO, StringIO
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# ============== ORGANIZER REGISTRATIONS ==============

@router.get("/organizer/registrations/{event_id}")
async def get_event_registrations(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event['organizer_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    registrations = await db.registrations.find({"event_id": event_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"registrations": registrations, "event": event}


@router.post("/organizer/events/{event_id}/add-participant")
async def add_participant_manually(event_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evenement introuvable")
    if event['organizer_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Non autorise")
    data = await request.json()
    first_name = data.get('first_name', '')
    last_name = data.get('last_name', '')
    email = data.get('email', '')
    gender = data.get('gender', 'M')
    birth_date = data.get('birth_date', '')
    selected_race = data.get('selected_race')
    if not first_name or not last_name or not email:
        raise HTTPException(status_code=400, detail="Prenom, nom et email requis")

    registration_id = f"reg_{uuid.uuid4().hex[:12]}"
    bib_number = generate_bib_number(event_id, selected_race or "")
    rfid_chip_id = generate_rfid_chip_id()
    category = calculate_category(birth_date, gender)
    base_price = event.get('price', 0)
    if selected_race and event.get('races'):
        for race in event['races']:
            if race['name'] == selected_race:
                base_price = race.get('price', base_price)
                break
    qr_data = f"SPORTSCONNECT:{registration_id}:{bib_number}"
    qr_code = generate_qr_code(qr_data)

    registration_doc = {
        "registration_id": registration_id, "event_id": event_id,
        "user_id": f"manual_{uuid.uuid4().hex[:8]}",
        "user_name": f"{first_name} {last_name}", "user_email": email,
        "first_name": first_name, "last_name": last_name,
        "gender": gender, "birth_date": birth_date, "category": category,
        "bib_number": bib_number, "rfid_chip_id": rfid_chip_id,
        "selected_race": selected_race, "selected_wave": data.get('selected_wave'),
        "selected_options": None, "emergency_contact": data.get('emergency_contact', ''),
        "emergency_phone": data.get('emergency_phone', ''),
        "custom_fields_data": None, "team_id": None,
        "payment_status": "completed", "payment_id": "manual",
        "checkout_session_id": None, "base_price": base_price,
        "service_fee": 0, "amount_paid": 0, "stripe_fee": 0,
        "platform_net": 0, "organizer_amount": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "confirmed",
        "pps_number": data.get('pps_number'), "pps_verified": False,
        "medical_cert_url": None, "medical_cert_verified": False,
        "qr_code": qr_code, "checked_in": False, "checked_in_at": None,
        "race_started": False, "race_start_time": None,
        "race_finished": False, "race_finish_time": None,
        "race_duration_seconds": None, "manual_entry": True
    }
    await db.registrations.insert_one(registration_doc)
    await db.events.update_one({"event_id": event_id}, {"$inc": {"current_participants": 1}})
    if selected_race and event.get('races'):
        await db.events.update_one(
            {"event_id": event_id, "races.name": selected_race},
            {"$inc": {"races.$.current_participants": 1}}
        )
    return {"message": f"Participant {first_name} {last_name} ajoute", "registration_id": registration_id, "bib_number": bib_number}


@router.get("/organizer/promo-codes")
async def get_organizer_promo_codes(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    query = {"organizer_id": current_user['user_id']}
    if current_user['role'] == 'admin':
        query = {}
    promos = await db.promo_codes.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"promo_codes": promos}


@router.delete("/organizer/promo-codes/{promo_id}")
async def delete_promo_code(promo_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    result = await db.promo_codes.delete_one({"promo_id": promo_id, "organizer_id": current_user['user_id']})
    if result.deleted_count == 0:
        if current_user['role'] == 'admin':
            await db.promo_codes.delete_one({"promo_id": promo_id})
        else:
            raise HTTPException(status_code=404, detail="Code promo non trouve")
    return {"message": "Code promo supprime"}


@router.get("/organizer/all-participants")
async def get_all_organizer_participants(current_user: dict = Depends(get_current_user), event_id: Optional[str] = None):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    query = {"organizer_id": current_user['user_id']}
    if current_user['role'] == 'admin':
        query = {}
    events = await db.events.find(query, {"_id": 0, "event_id": 1, "title": 1}).to_list(200)
    event_ids = [e["event_id"] for e in events]
    event_map = {e["event_id"]: e["title"] for e in events}
    if not event_ids:
        return {"participants": [], "total": 0}
    reg_query = {"event_id": {"$in": event_ids}}
    if event_id:
        reg_query = {"event_id": event_id}
    registrations = await db.registrations.find(reg_query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    for reg in registrations:
        reg["event_title"] = event_map.get(reg.get("event_id"), "")
    return {"participants": registrations, "total": len(registrations)}


# ============== CORRESPONDANCES ==============

@router.post("/organizer/correspondances/send")
async def send_correspondance(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    subject = data.get("subject", "")
    message_content = data.get("message", "")
    recipient_ids = data.get("recipient_ids", [])
    event_id = data.get("event_id")
    send_email_flag = data.get("send_email", False)
    if not message_content:
        raise HTTPException(status_code=400, detail="Message requis")
    if recipient_ids == "all" and event_id:
        regs = await db.registrations.find({"event_id": event_id}, {"_id": 0}).to_list(5000)
    elif isinstance(recipient_ids, list) and len(recipient_ids) > 0:
        regs = await db.registrations.find({"registration_id": {"$in": recipient_ids}}, {"_id": 0}).to_list(5000)
    else:
        raise HTTPException(status_code=400, detail="Destinataires requis")
    if not regs:
        raise HTTPException(status_code=404, detail="Aucun destinataire trouve")

    corr_id = f"corr_{uuid.uuid4().hex[:12]}"
    correspondance = {
        "correspondance_id": corr_id,
        "organizer_id": current_user["user_id"], "organizer_name": current_user["name"],
        "event_id": event_id, "subject": subject, "message": message_content,
        "recipient_count": len(regs),
        "recipients": [{"registration_id": r["registration_id"], "user_name": r.get("user_name", ""), "email": r.get("email", "")} for r in regs],
        "send_email": send_email_flag, "email_sent_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.correspondances.insert_one(correspondance)

    email_sent = 0
    if send_email_flag:
        from email_service import send_email
        for reg in regs:
            email = reg.get("email")
            if email:
                try:
                    await send_email(
                        to_email=email,
                        subject=f"[SportLyo] {subject}",
                        html_content=f'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#1a1a2e;padding:20px;text-align:center;"><h2 style="color:#ff4500;margin:0;">SportLyo</h2></div><div style="padding:24px;background:#fff;"><p>Bonjour {reg.get("user_name", "")},</p><div style="white-space:pre-wrap;">{message_content}</div><hr style="border:none;border-top:1px solid #eee;margin:20px 0;"><p style="color:#888;font-size:12px;">Message envoye par {current_user["name"]} via SportLyo</p></div></div>'
                    )
                    email_sent += 1
                except Exception as e:
                    logger.error(f"Email send error: {e}")
    await db.correspondances.update_one({"correspondance_id": corr_id}, {"$set": {"email_sent_count": email_sent}})
    del correspondance["_id"]
    correspondance["email_sent_count"] = email_sent
    return {"correspondance": correspondance, "message": f"Message envoye a {len(regs)} destinataire(s), {email_sent} email(s) envoye(s)"}


@router.get("/organizer/correspondances")
async def get_correspondances(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    query = {"organizer_id": current_user["user_id"]}
    if current_user['role'] == 'admin':
        query = {}
    corrs = await db.correspondances.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"correspondances": corrs}


# ============== CHECK-IN ==============

@router.post("/organizer/checkin/mark-collected")
async def mark_collected(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    registration_id = data.get("registration_id")
    if not registration_id:
        raise HTTPException(status_code=400, detail="registration_id requis")
    result = await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {"kit_collected": True, "kit_collected_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Inscription non trouvee")
    return {"message": "Kit recupere marque", "registration_id": registration_id}


@router.post("/checkin/scan")
async def checkin_scan(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    registration_id = data.get('registration_id')
    bib_number = data.get('bib_number')
    if registration_id:
        reg = await db.registrations.find_one({"registration_id": registration_id}, {"_id": 0})
    elif bib_number:
        reg = await db.registrations.find_one({"bib_number": bib_number}, {"_id": 0})
    else:
        raise HTTPException(status_code=400, detail="registration_id ou bib_number requis")
    if not reg:
        raise HTTPException(status_code=404, detail="Inscription non trouvee")
    if reg.get('checked_in'):
        return {"status": "already_checked_in", "registration": reg, "message": "Deja pointe !"}
    await db.registrations.update_one(
        {"registration_id": reg['registration_id']},
        {"$set": {"checked_in": True, "checkin_time": datetime.now(timezone.utc).isoformat()}}
    )
    reg['checked_in'] = True
    return {"status": "ok", "registration": reg, "message": f"Dossard {reg['bib_number']} valide !"}



# ============== CONTACT ADMIN ==============

@router.post("/organizer/contact-admin")
async def contact_admin(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    message_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "from_user_id": current_user['user_id'], "from_name": current_user['name'],
        "from_email": current_user['email'], "subject": data.get('subject', ''),
        "message": data.get('message', ''), "type": data.get('type', 'general'),
        "event_id": data.get('event_id'), "registration_id": data.get('registration_id'),
        "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_messages.insert_one(message_doc)
    return {"message": "Message envoye a l'administrateur"}


# ============== PARTNERS ==============

@router.get("/organizer/partners")
async def get_partners(current_user: dict = Depends(get_current_user), category: Optional[str] = None):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    query = {"organizer_id": current_user['user_id']}
    if category:
        query["category"] = category
    partners = await db.partners.find(query, {"_id": 0}).sort("company_name", 1).to_list(500)
    return {"partners": partners}


@router.post("/organizer/partners")
async def create_partner(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    if not data.get("company_name"):
        raise HTTPException(status_code=400, detail="Nom de l'entreprise requis")
    partner = {
        "partner_id": f"part_{uuid.uuid4().hex[:12]}", "organizer_id": current_user['user_id'],
        "company_name": data.get("company_name", ""), "contact_name": data.get("contact_name", ""),
        "phone": data.get("phone", ""), "email": data.get("email", ""),
        "address": data.get("address", ""), "category": data.get("category", "Autre"),
        "notes": data.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.partners.insert_one(partner)
    del partner["_id"]
    return {"partner": partner}


@router.put("/organizer/partners/{partner_id}")
async def update_partner(partner_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    update_fields = {}
    for field in ["company_name", "contact_name", "phone", "email", "address", "category", "notes"]:
        if field in data:
            update_fields[field] = data[field]
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.partners.update_one({"partner_id": partner_id, "organizer_id": current_user['user_id']}, {"$set": update_fields})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Partenaire non trouve")
    updated = await db.partners.find_one({"partner_id": partner_id}, {"_id": 0})
    return {"partner": updated}


@router.delete("/organizer/partners/{partner_id}")
async def delete_partner(partner_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    result = await db.partners.delete_one({"partner_id": partner_id, "organizer_id": current_user['user_id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partenaire non trouve")
    return {"message": "Partenaire supprime"}


@router.get("/organizer/partners/categories")
async def get_partner_categories(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    categories = await db.partners.distinct("category", {"organizer_id": current_user['user_id']})
    return {"categories": categories}


# ============== SPONSORS ==============

@router.get("/organizer/sponsors")
async def get_sponsors(current_user: dict = Depends(get_current_user), sponsor_type: Optional[str] = None):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    query = {"organizer_id": current_user['user_id']}
    if sponsor_type and sponsor_type != 'all':
        query["sponsor_type"] = sponsor_type
    sponsors = await db.sponsors.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"sponsors": sponsors}


@router.post("/organizer/sponsors")
async def create_sponsor(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    if not data.get("name"):
        raise HTTPException(status_code=400, detail="Nom requis")
    sponsor = {
        "sponsor_id": f"spon_{uuid.uuid4().hex[:12]}", "organizer_id": current_user['user_id'],
        "name": data.get("name", ""), "sponsor_type": data.get("sponsor_type", "Sponsor"),
        "tier": data.get("tier", "Bronze"), "contact_name": data.get("contact_name", ""),
        "phone": data.get("phone", ""), "email": data.get("email", ""),
        "address": data.get("address", ""), "website": data.get("website", ""),
        "logo_url": data.get("logo_url", ""), "amount": data.get("amount", 0),
        "currency": data.get("currency", "EUR"),
        "contribution_type": data.get("contribution_type", "Financier"),
        "contribution_details": data.get("contribution_details", ""),
        "counterparts": data.get("counterparts", ""),
        "contract_start": data.get("contract_start", ""), "contract_end": data.get("contract_end", ""),
        "event_id": data.get("event_id", ""), "notes": data.get("notes", ""),
        "status": data.get("status", "Actif"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sponsors.insert_one(sponsor)
    del sponsor["_id"]
    return {"sponsor": sponsor}


@router.put("/organizer/sponsors/{sponsor_id}")
async def update_sponsor(sponsor_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    update_fields = {k: v for k, v in data.items() if k in [
        "name", "sponsor_type", "tier", "contact_name", "phone", "email", "address",
        "website", "logo_url", "amount", "currency", "contribution_type",
        "contribution_details", "counterparts", "contract_start", "contract_end",
        "event_id", "notes", "status"
    ]}
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.sponsors.update_one({"sponsor_id": sponsor_id, "organizer_id": current_user['user_id']}, {"$set": update_fields})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Sponsor non trouve")
    updated = await db.sponsors.find_one({"sponsor_id": sponsor_id}, {"_id": 0})
    return {"sponsor": updated}


@router.delete("/organizer/sponsors/{sponsor_id}")
async def delete_sponsor(sponsor_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    result = await db.sponsors.delete_one({"sponsor_id": sponsor_id, "organizer_id": current_user['user_id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sponsor non trouve")
    return {"message": "Sponsor supprime"}


# ============== CORPORATE BOOKINGS ==============

@router.get("/organizer/bookings")
async def get_corporate_bookings(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    bookings = await db.corporate_bookings.find({"organizer_id": current_user['user_id']}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"bookings": bookings}


@router.post("/organizer/bookings")
async def create_corporate_booking(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    booking = {
        "booking_id": f"bk_{uuid.uuid4().hex[:12]}", "organizer_id": current_user['user_id'],
        "company_name": data.get("company_name", ""), "contact_name": data.get("contact_name", ""),
        "email": data.get("email", ""), "phone": data.get("phone", ""),
        "team_count": int(data.get("team_count", 1)),
        "members_per_team": int(data.get("members_per_team", 5)),
        "event_id": data.get("event_id", ""),
        "price_per_team": float(data.get("price_per_team", 0)),
        "total_amount": float(data.get("price_per_team", 0)) * int(data.get("team_count", 1)),
        "payment_status": "pending", "payment_link": "", "square_payment_id": "",
        "notes": data.get("notes", ""), "status": "En attente",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.corporate_bookings.insert_one(booking)
    del booking["_id"]
    return {"booking": booking}


@router.put("/organizer/bookings/{booking_id}")
async def update_corporate_booking(booking_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    fields = {}
    for f in ["company_name", "contact_name", "email", "phone", "team_count", "members_per_team", "event_id", "price_per_team", "notes", "status"]:
        if f in data:
            fields[f] = data[f]
    if "team_count" in fields and "price_per_team" in fields:
        fields["total_amount"] = float(fields["price_per_team"]) * int(fields["team_count"])
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.corporate_bookings.update_one({"booking_id": booking_id, "organizer_id": current_user['user_id']}, {"$set": fields})
    updated = await db.corporate_bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    return {"booking": updated}


@router.delete("/organizer/bookings/{booking_id}")
async def delete_corporate_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    await db.corporate_bookings.delete_one({"booking_id": booking_id, "organizer_id": current_user['user_id']})
    return {"message": "Reservation supprimee"}


# ============== ORGANIZER LOGO ==============

@router.post("/organizer/logo")
async def upload_organizer_logo(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    logo_url = data.get("logo_url", "")
    if not logo_url:
        raise HTTPException(status_code=400, detail="URL du logo requis")
    await db.users.update_one({"user_id": current_user['user_id']}, {"$set": {"logo_url": logo_url, "logo_uploaded_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Logo enregistre", "logo_url": logo_url}


@router.get("/organizer/logo")
async def get_organizer_logo(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    user = await db.users.find_one({"user_id": current_user['user_id']}, {"_id": 0, "logo_url": 1, "logo_uploaded_at": 1})
    return {"logo_url": user.get("logo_url", ""), "logo_uploaded_at": user.get("logo_uploaded_at", "")}


@router.get("/provider/organizer-logos")
async def get_organizer_logos_for_provider(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    organizers = await db.users.find(
        {"role": "organizer", "logo_url": {"$exists": True, "$ne": ""}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "logo_url": 1, "logo_uploaded_at": 1}
    ).to_list(100)
    return {"organizers": organizers}


# ============== EXPORT TIMING CSV ==============

@router.get("/organizer/events/{event_id}/export-timing")
async def export_timing_csv(event_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    registrations = await db.registrations.find(
        {"event_id": event_id, "payment_status": "completed"}, {"_id": 0}
    ).sort("bib_number", 1).to_list(10000)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["BibNumber", "FirstName", "LastName", "RFID", "Gender", "Category", "Race", "Email"])
    for r in registrations:
        writer.writerow([
            r.get('bib_number', ''), r.get('first_name', ''), r.get('last_name', ''),
            r.get('rfid_chip_id', ''), r.get('gender', ''), r.get('category', ''),
            r.get('selected_race', ''), r.get('user_email', '')
        ])
    csv_bytes = BytesIO(output.getvalue().encode('utf-8-sig'))
    return StreamingResponse(csv_bytes, media_type="text/csv; charset=utf-8",
                            headers={"Content-Disposition": f'attachment; filename="timing_export_{event_id}.csv"'})


# ============== VOLUNTEERS ==============

@router.get("/organizer/volunteers")
async def get_volunteers(current_user: dict = Depends(get_current_user), event_id: Optional[str] = None):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    query = {"organizer_id": current_user['user_id']}
    if event_id:
        query["event_id"] = event_id
    volunteers = await db.volunteers.find(query, {"_id": 0}).sort("last_name", 1).to_list(500)
    return {"volunteers": volunteers}


@router.post("/organizer/volunteers")
async def create_volunteer(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    if not data.get("first_name") or not data.get("last_name") or not data.get("phone") or not data.get("role_assigned") or not data.get("event_id"):
        raise HTTPException(status_code=400, detail="Prenom, nom, telephone, fonction et evenement requis")
    volunteer = {
        "volunteer_id": f"vol_{uuid.uuid4().hex[:12]}",
        "organizer_id": current_user['user_id'],
        "first_name": data.get("first_name", ""),
        "last_name": data.get("last_name", ""),
        "phone": data.get("phone", ""),
        "email": data.get("email", ""),
        "role_assigned": data.get("role_assigned", ""),
        "event_id": data.get("event_id", ""),
        "notes": data.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.volunteers.insert_one(volunteer)
    del volunteer["_id"]
    return {"volunteer": volunteer}


@router.put("/organizer/volunteers/{volunteer_id}")
async def update_volunteer(volunteer_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    update_fields = {}
    for field in ["first_name", "last_name", "phone", "email", "role_assigned", "event_id", "notes"]:
        if field in data:
            update_fields[field] = data[field]
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.volunteers.update_one({"volunteer_id": volunteer_id, "organizer_id": current_user['user_id']}, {"$set": update_fields})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Benevole non trouve")
    updated = await db.volunteers.find_one({"volunteer_id": volunteer_id}, {"_id": 0})
    return {"volunteer": updated}


@router.delete("/organizer/volunteers/{volunteer_id}")
async def delete_volunteer(volunteer_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    result = await db.volunteers.delete_one({"volunteer_id": volunteer_id, "organizer_id": current_user['user_id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Benevole non trouve")
    return {"message": "Benevole supprime"}
