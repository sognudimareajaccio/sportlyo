from fastapi import APIRouter, HTTPException, Depends, Request, Query
from deps import db, get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


@router.post("/checkin/scan")
async def checkin_participant(request: Request, current_user: dict = Depends(get_current_user)):
    """Check-in a participant by bib number or registration_id."""
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    event_id = data.get("event_id", "")
    bib_number = data.get("bib_number")
    registration_id = data.get("registration_id")

    if not event_id:
        raise HTTPException(status_code=400, detail="event_id requis")

    # Find registration
    query = {"event_id": event_id}
    if bib_number:
        query["bib_number"] = int(bib_number) if str(bib_number).isdigit() else bib_number
    elif registration_id:
        query["registration_id"] = registration_id
    else:
        raise HTTPException(status_code=400, detail="bib_number ou registration_id requis")

    reg = await db.registrations.find_one(query, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Inscription non trouvee")

    if reg.get("checked_in"):
        return {
            "status": "already_checked_in",
            "message": f"{reg.get('participant_name', 'Participant')} est deja enregistre",
            "registration": {
                "registration_id": reg["registration_id"],
                "participant_name": reg.get("participant_name", ""),
                "bib_number": reg.get("bib_number"),
                "selected_race": reg.get("selected_race", ""),
                "checked_in_at": reg.get("checked_in_at")
            }
        }

    await db.registrations.update_one(
        {"registration_id": reg["registration_id"]},
        {"$set": {
            "checked_in": True,
            "checked_in_at": datetime.now(timezone.utc).isoformat(),
            "checked_in_by": current_user["user_id"]
        }}
    )

    return {
        "status": "success",
        "message": f"{reg.get('participant_name', 'Participant')} enregistre avec succes",
        "registration": {
            "registration_id": reg["registration_id"],
            "participant_name": reg.get("participant_name", ""),
            "bib_number": reg.get("bib_number"),
            "selected_race": reg.get("selected_race", ""),
            "tshirt_size": reg.get("tshirt_size", ""),
            "emergency_contact": reg.get("emergency_contact", ""),
            "emergency_phone": reg.get("emergency_phone", ""),
            "pps_status": reg.get("pps_status", "")
        }
    }


@router.post("/checkin/undo")
async def undo_checkin(request: Request, current_user: dict = Depends(get_current_user)):
    """Undo a check-in."""
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    registration_id = data.get("registration_id")
    if not registration_id:
        raise HTTPException(status_code=400, detail="registration_id requis")

    await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {"checked_in": False}, "$unset": {"checked_in_at": "", "checked_in_by": ""}}
    )
    return {"message": "Check-in annule"}


@router.get("/checkin/stats/{event_id}")
async def get_checkin_stats(event_id: str, current_user: dict = Depends(get_current_user)):
    """Get check-in statistics for an event."""
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")

    total = await db.registrations.count_documents({"event_id": event_id})
    checked_in = await db.registrations.count_documents({"event_id": event_id, "checked_in": True})

    regs = await db.registrations.find(
        {"event_id": event_id},
        {"_id": 0, "registration_id": 1, "participant_name": 1, "bib_number": 1,
         "selected_race": 1, "checked_in": 1, "checked_in_at": 1,
         "tshirt_size": 1, "emergency_contact": 1, "emergency_phone": 1, "pps_status": 1}
    ).sort("bib_number", 1).to_list(5000)

    return {
        "total": total,
        "checked_in": checked_in,
        "remaining": total - checked_in,
        "percentage": round((checked_in / total * 100), 1) if total > 0 else 0,
        "registrations": regs
    }


@router.get("/checkin/search/{event_id}")
async def search_participant(event_id: str, q: str = Query("", min_length=1), current_user: dict = Depends(get_current_user)):
    """Search participant by name or bib for check-in."""
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")

    query = {"event_id": event_id}
    if q.isdigit():
        query["bib_number"] = int(q)
    else:
        query["participant_name"] = {"$regex": q, "$options": "i"}

    regs = await db.registrations.find(
        query,
        {"_id": 0, "registration_id": 1, "participant_name": 1, "bib_number": 1,
         "selected_race": 1, "checked_in": 1, "tshirt_size": 1,
         "emergency_contact": 1, "emergency_phone": 1}
    ).limit(20).to_list(20)

    return {"results": regs}
