from fastapi import APIRouter, HTTPException, Depends, Request
from deps import (db, get_current_user, get_current_price, generate_bib_number,
                  generate_rfid_chip_id, calculate_category, calculate_age,
                  generate_qr_code, PLATFORM_COMMISSION, STRIPE_PERCENT_FEE, STRIPE_FIXED_FEE)
from models import RegistrationCreate, TeamCreate
import uuid
import asyncio
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.post("/registrations")
async def create_registration(reg_data: RegistrationCreate, current_user: dict = Depends(get_current_user)):
    if not reg_data.emergency_contact or not reg_data.emergency_phone:
        raise HTTPException(status_code=400, detail="Le contact d'urgence est obligatoire (nom et telephone)")

    event = await db.events.find_one({"event_id": reg_data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evenement introuvable")

    if event.get('date'):
        try:
            event_date = datetime.fromisoformat(event['date'].replace('Z', '+00:00'))
            if event_date < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Inscriptions fermees (evenement passe)")
        except (ValueError, TypeError):
            pass

    if event['current_participants'] >= event['max_participants']:
        raise HTTPException(status_code=400, detail="Complet ! Inscrivez-vous en liste d'attente.")

    if reg_data.selected_race and event.get('races'):
        for race in event['races']:
            if race['name'] == reg_data.selected_race:
                if race.get('current_participants', 0) >= race.get('max_participants', 9999):
                    raise HTTPException(status_code=400, detail=f"L'epreuve {reg_data.selected_race} est complete")
                break

    if reg_data.selected_wave and event.get('waves'):
        for wave in event['waves']:
            if wave['wave_id'] == reg_data.selected_wave:
                if wave.get('current_participants', 0) >= wave['max_participants']:
                    raise HTTPException(status_code=400, detail="Selected wave is full")
                break

    if event.get('min_age') or event.get('max_age'):
        birth_date = current_user.get('birth_date')
        if birth_date:
            age = calculate_age(birth_date)
            if event.get('min_age') and age < event['min_age']:
                raise HTTPException(status_code=400, detail=f"Age minimum: {event['min_age']} ans")
            if event.get('max_age') and age > event['max_age']:
                raise HTTPException(status_code=400, detail=f"Age maximum: {event['max_age']} ans")

    pps_verified = False
    pps_pending = False
    if event.get('requires_pps'):
        pps_number = reg_data.pps_number or current_user.get('pps_number')
        if pps_number:
            pps_verified = True
        else:
            pps_pending = True

    existing = await db.registrations.find_one({
        "event_id": reg_data.event_id,
        "user_id": current_user['user_id'],
        "status": "confirmed"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already registered")

    registration_id = f"reg_{uuid.uuid4().hex[:12]}"
    bib_number = generate_bib_number(reg_data.event_id, reg_data.selected_race or "")
    rfid_chip_id = generate_rfid_chip_id()

    first_name = reg_data.first_name or current_user.get('name', '').split(' ')[0]
    last_name = reg_data.last_name or ' '.join(current_user.get('name', '').split(' ')[1:]) or current_user.get('name', '')
    gender = reg_data.gender or "M"
    category = calculate_category(reg_data.birth_date, gender)

    participant_age = None
    if reg_data.birth_date:
        try:
            birth = datetime.fromisoformat(reg_data.birth_date)
            participant_age = (datetime.now(timezone.utc) - birth.replace(tzinfo=timezone.utc)).days // 365
        except:
            pass

    base_price = get_current_price(event)
    if reg_data.selected_race and event.get('races'):
        for race in event['races']:
            if race['name'] == reg_data.selected_race:
                base_price = race.get('price', base_price)
                break

    options_total = 0
    if reg_data.selected_options and event.get('options'):
        for opt_id in reg_data.selected_options:
            for opt in event['options']:
                if opt['option_id'] == opt_id:
                    options_total += opt['price']
                    break

    total_price = base_price + options_total
    ffa_discount = 0
    if reg_data.ffa_license and len(reg_data.ffa_license) >= 6:
        ffa_discount = 3.0
        total_price = max(0, total_price - ffa_discount)

    service_fee = round(total_price * PLATFORM_COMMISSION, 2)
    total_to_pay = round(total_price + service_fee, 2)
    stripe_fee = round(total_to_pay * STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE, 2)
    platform_net = round(service_fee - stripe_fee, 2)
    organizer_amount = total_price

    qr_data = f"SPORTSCONNECT:{registration_id}:{bib_number}"
    qr_code = generate_qr_code(qr_data)

    registration_doc = {
        "registration_id": registration_id,
        "event_id": reg_data.event_id,
        "user_id": current_user['user_id'],
        "user_name": current_user['name'],
        "user_email": current_user['email'],
        "first_name": first_name, "last_name": last_name,
        "gender": gender, "birth_date": reg_data.birth_date,
        "category": category, "bib_number": bib_number,
        "rfid_chip_id": rfid_chip_id,
        "selected_race": reg_data.selected_race,
        "selected_wave": reg_data.selected_wave,
        "selected_options": reg_data.selected_options,
        "emergency_contact": reg_data.emergency_contact,
        "emergency_phone": reg_data.emergency_phone,
        "country": reg_data.country, "city": reg_data.city,
        "postal_code": reg_data.postal_code,
        "email": reg_data.email or current_user['email'],
        "phone": reg_data.phone, "nationality": reg_data.nationality,
        "club_name": reg_data.club_name, "tshirt_size": reg_data.tshirt_size,
        "ffa_license": reg_data.ffa_license, "ffa_discount": ffa_discount,
        "custom_fields_data": reg_data.custom_fields_data,
        "team_id": reg_data.team_id,
        "payment_status": "pending", "payment_id": None, "checkout_session_id": None,
        "base_price": total_price, "service_fee": service_fee,
        "amount_paid": total_to_pay, "stripe_fee": stripe_fee,
        "platform_net": platform_net, "organizer_amount": organizer_amount,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "confirmed",
        "pps_number": reg_data.pps_number or current_user.get('pps_number'),
        "pps_verified": pps_verified, "pps_pending": pps_pending,
        "pps_document_url": None, "pps_uploaded_at": None, "pps_status": None,
        "age": participant_age,
        "medical_cert_url": None, "medical_cert_verified": False,
        "qr_code": qr_code, "checked_in": False, "checked_in_at": None,
        "race_started": False, "race_start_time": None,
        "race_finished": False, "race_finish_time": None,
        "race_duration_seconds": None
    }

    await db.registrations.insert_one(registration_doc)
    await db.events.update_one({"event_id": reg_data.event_id}, {"$inc": {"current_participants": 1}})

    if reg_data.selected_race and event.get('races'):
        await db.events.update_one(
            {"event_id": reg_data.event_id, "races.name": reg_data.selected_race},
            {"$inc": {"races.$.current_participants": 1}}
        )
    if reg_data.selected_wave and event.get('waves'):
        await db.events.update_one(
            {"event_id": reg_data.event_id, "waves.wave_id": reg_data.selected_wave},
            {"$inc": {"waves.$.current_participants": 1}}
        )

    try:
        from email_service import send_email, email_registration_confirmed, email_new_registration_organizer
        subj, html = email_registration_confirmed(
            participant_name=f"{first_name} {last_name}",
            event_title=event['title'], race_name=reg_data.selected_race or "",
            bib_number=bib_number, event_date=event.get('date', ''),
            event_location=event.get('location', ''), amount=total_to_pay, qr_code=qr_code
        )
        asyncio.create_task(send_email(current_user['email'], subj, html))
    except Exception as e:
        logger.error(f"Registration email error: {e}")

    try:
        from email_service import send_email, email_new_registration_organizer
        organizer = await db.users.find_one({"user_id": event.get('organizer_id')}, {"_id": 0})
        if organizer:
            updated_event = await db.events.find_one({"event_id": reg_data.event_id}, {"_id": 0})
            subj_o, html_o = email_new_registration_organizer(
                organizer_name=organizer.get('name', 'Organisateur'),
                participant_name=f"{first_name} {last_name}",
                event_title=event['title'], race_name=reg_data.selected_race or "",
                bib_number=bib_number,
                current_count=updated_event.get('current_participants', 0),
                max_count=updated_event.get('max_participants', 0)
            )
            asyncio.create_task(send_email(organizer['email'], subj_o, html_o))
    except Exception as e:
        logger.error(f"Organizer notification email error: {e}")

    return {
        "registration_id": registration_id, "bib_number": bib_number,
        "rfid_chip_id": rfid_chip_id, "category": category,
        "base_price": total_price, "service_fee": service_fee,
        "amount": total_to_pay, "event_title": event['title'], "qr_code": qr_code
    }


@router.get("/registrations")
async def get_user_registrations(current_user: dict = Depends(get_current_user)):
    registrations = await db.registrations.find({"user_id": current_user['user_id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for reg in registrations:
        event = await db.events.find_one({"event_id": reg['event_id']}, {"_id": 0})
        if event:
            reg['event'] = event
    return {"registrations": registrations}


@router.get("/registrations/{registration_id}")
async def get_registration(registration_id: str, current_user: dict = Depends(get_current_user)):
    registration = await db.registrations.find_one({"registration_id": registration_id}, {"_id": 0})
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration['user_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    event = await db.events.find_one({"event_id": registration['event_id']}, {"_id": 0})
    registration['event'] = event
    return registration


@router.get("/registrations/{registration_id}/ticket")
async def get_digital_ticket(registration_id: str, current_user: dict = Depends(get_current_user)):
    registration = await db.registrations.find_one({"registration_id": registration_id}, {"_id": 0})
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration['user_id'] != current_user['user_id'] and current_user['role'] not in ['admin', 'organizer']:
        raise HTTPException(status_code=403, detail="Not authorized")
    event = await db.events.find_one({"event_id": registration['event_id']}, {"_id": 0})
    return {
        "ticket": {
            "registration_id": registration_id, "bib_number": registration['bib_number'],
            "participant_name": registration['user_name'],
            "event_title": event['title'] if event else "N/A",
            "event_date": event['date'] if event else None,
            "event_location": event['location'] if event else None,
            "selected_race": registration.get('selected_race'),
            "selected_wave": registration.get('selected_wave'),
            "qr_code": registration.get('qr_code'),
            "payment_status": registration['payment_status']
        }
    }


@router.post("/registrations/{registration_id}/transfer")
async def transfer_bib(registration_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    new_user_email = data.get('email')
    if not new_user_email:
        raise HTTPException(status_code=400, detail="Email du nouveau participant requis")
    registration = await db.registrations.find_one({"registration_id": registration_id}, {"_id": 0})
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration['user_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    new_user = await db.users.find_one({"email": new_user_email}, {"_id": 0})
    if not new_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    existing = await db.registrations.find_one({
        "event_id": registration['event_id'], "user_id": new_user['user_id'], "status": "confirmed"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Ce participant est deja inscrit")
    qr_data = f"SPORTSCONNECT:{registration_id}:{registration['bib_number']}"
    qr_code = generate_qr_code(qr_data)
    await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {
            "user_id": new_user['user_id'], "user_name": new_user['name'],
            "user_email": new_user['email'], "qr_code": qr_code,
            "transferred_from": current_user['user_id'],
            "transferred_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Dossard transfere avec succes", "new_participant": new_user['name']}


# ============== WAITLIST ==============

@router.post("/waitlist")
async def join_waitlist(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    event_id = data.get('event_id')
    selected_race = data.get('selected_race')
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    existing = await db.waitlist.find_one({"event_id": event_id, "user_id": current_user['user_id']})
    if existing:
        raise HTTPException(status_code=400, detail="Deja sur la liste d'attente")
    count = await db.waitlist.count_documents({"event_id": event_id})
    waitlist_doc = {
        "waitlist_id": f"wl_{uuid.uuid4().hex[:12]}",
        "event_id": event_id, "user_id": current_user['user_id'],
        "user_name": current_user['name'], "user_email": current_user['email'],
        "selected_race": selected_race, "position": count + 1,
        "created_at": datetime.now(timezone.utc).isoformat(), "notified": False
    }
    await db.waitlist.insert_one(waitlist_doc)
    return {"message": "Ajoute a la liste d'attente", "position": count + 1}


@router.get("/waitlist/{event_id}")
async def get_waitlist_position(event_id: str, current_user: dict = Depends(get_current_user)):
    entry = await db.waitlist.find_one({"event_id": event_id, "user_id": current_user['user_id']}, {"_id": 0})
    if not entry:
        return {"on_waitlist": False}
    return {"on_waitlist": True, "position": entry['position'], "created_at": entry['created_at']}


@router.post("/waitlist-email")
async def waitlist_email(request: Request):
    data = await request.json()
    email = data.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Email requis")
    existing = await db.waitlist_emails.find_one({"email": email})
    if not existing:
        await db.waitlist_emails.insert_one({"email": email, "created_at": datetime.now(timezone.utc).isoformat()})
    try:
        from email_service import send_email
        from deps import ADMIN_NOTIFICATION_EMAIL
        count = await db.waitlist_emails.count_documents({})
        subject = f"SportLyo - Nouvel inscrit waitlist ({count} au total)"
        html = f'<p><strong>{email}</strong> souhaite etre notifie du lancement. Total: {count}</p>'
        asyncio.create_task(send_email(ADMIN_NOTIFICATION_EMAIL, subject, html))
    except Exception as e:
        logger.error(f"Waitlist notification error: {e}")
    return {"success": True}


# ============== TEAMS ==============

@router.post("/teams")
async def create_team(team_data: TeamCreate, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": team_data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not event.get('allows_teams'):
        raise HTTPException(status_code=400, detail="Teams not allowed for this event")
    team_id = f"team_{uuid.uuid4().hex[:12]}"
    team_doc = {
        "team_id": team_id, "event_id": team_data.event_id,
        "team_name": team_data.team_name, "captain_user_id": current_user['user_id'],
        "selected_race": team_data.selected_race,
        "members": [{"user_id": current_user['user_id'], "name": current_user['name'], "email": current_user['email'], "role": "captain"}],
        "created_at": datetime.now(timezone.utc).isoformat(), "status": "forming"
    }
    await db.teams.insert_one(team_doc)
    return {"team_id": team_id, "team_name": team_data.team_name}


@router.post("/teams/{team_id}/join")
async def join_team(team_id: str, current_user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"team_id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    event = await db.events.find_one({"event_id": team['event_id']}, {"_id": 0})
    if event.get('team_max_size') and len(team['members']) >= event['team_max_size']:
        raise HTTPException(status_code=400, detail="Team is full")
    for member in team['members']:
        if member['user_id'] == current_user['user_id']:
            raise HTTPException(status_code=400, detail="Already a team member")
    await db.teams.update_one(
        {"team_id": team_id},
        {"$push": {"members": {"user_id": current_user['user_id'], "name": current_user['name'], "email": current_user['email'], "role": "member"}}}
    )
    return {"message": "Joined team successfully"}


@router.get("/teams/{team_id}")
async def get_team(team_id: str):
    team = await db.teams.find_one({"team_id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team
