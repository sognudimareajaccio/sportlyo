from fastapi import APIRouter, HTTPException, Depends, Request
from deps import db, get_current_user
import uuid, os, logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_FROM = os.environ.get("TWILIO_PHONE_NUMBER")


def get_twilio_client():
    if TWILIO_SID and TWILIO_TOKEN:
        try:
            from twilio.rest import Client
            return Client(TWILIO_SID, TWILIO_TOKEN)
        except Exception as e:
            logger.error(f"Twilio init error: {e}")
    return None


@router.post("/sms/send")
async def send_sms(request: Request, current_user: dict = Depends(get_current_user)):
    """Send SMS notification to participants. Requires organizer/admin role."""
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")

    data = await request.json()
    event_id = data.get("event_id", "")
    message = data.get("message", "").strip()
    recipients = data.get("recipients", "all")  # "all" or list of registration_ids

    if not message:
        raise HTTPException(status_code=400, detail="Message requis")
    if not event_id:
        raise HTTPException(status_code=400, detail="event_id requis")

    # Get participants with phone numbers
    query = {"event_id": event_id}
    if isinstance(recipients, list) and recipients:
        query["registration_id"] = {"$in": recipients}

    regs = await db.registrations.find(query, {"_id": 0}).to_list(5000)
    phones = []
    for r in regs:
        user = await db.users.find_one({"user_id": r.get("user_id")}, {"_id": 0, "phone": 1, "name": 1})
        if user and user.get("phone"):
            phones.append({"phone": user["phone"], "name": user.get("name", ""), "user_id": r.get("user_id")})

    # Store SMS record
    sms_record = {
        "sms_id": f"sms_{uuid.uuid4().hex[:12]}",
        "event_id": event_id,
        "sender_id": current_user["user_id"],
        "sender_name": current_user.get("company_name") or current_user["name"],
        "message": message[:500],
        "recipient_count": len(phones),
        "total_participants": len(regs),
        "status": "pending",
        "sent_count": 0,
        "failed_count": 0,
        "twilio_enabled": bool(TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    client = get_twilio_client()
    sent = 0
    failed = 0

    if client and TWILIO_FROM:
        for p in phones:
            try:
                client.messages.create(
                    body=message,
                    from_=TWILIO_FROM,
                    to=p["phone"]
                )
                sent += 1
            except Exception as e:
                logger.error(f"SMS failed for {p['phone']}: {e}")
                failed += 1
        sms_record["status"] = "sent"
        sms_record["sent_count"] = sent
        sms_record["failed_count"] = failed
    else:
        sms_record["status"] = "queued"
        sms_record["note"] = "Twilio non configure — SMS stockes pour envoi ulterieur"

    await db.sms_notifications.insert_one(sms_record)
    del sms_record["_id"]

    return {
        "sms": sms_record,
        "message": f"{sent} SMS envoyes, {failed} echecs" if client else f"Twilio non configure. {len(phones)} SMS en attente."
    }


@router.get("/sms/history")
async def get_sms_history(current_user: dict = Depends(get_current_user)):
    """Get SMS notification history."""
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")

    query = {} if current_user['role'] == 'admin' else {"sender_id": current_user["user_id"]}
    history = await db.sms_notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"history": history}


@router.get("/sms/config")
async def get_sms_config(current_user: dict = Depends(get_current_user)):
    """Check Twilio configuration status."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    return {
        "configured": bool(TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM),
        "has_sid": bool(TWILIO_SID),
        "has_token": bool(TWILIO_TOKEN),
        "has_from": bool(TWILIO_FROM),
        "phone_number": TWILIO_FROM[:6] + "..." if TWILIO_FROM else None
    }
