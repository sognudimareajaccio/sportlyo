from fastapi import APIRouter, HTTPException, Depends, Request, Query
from deps import db, get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


@router.post("/refunds/request")
async def request_refund(request: Request, current_user: dict = Depends(get_current_user)):
    """Participant requests a refund for a registration."""
    data = await request.json()
    registration_id = data.get("registration_id")
    reason = data.get("reason", "").strip()
    if not registration_id:
        raise HTTPException(status_code=400, detail="registration_id requis")
    if not reason:
        raise HTTPException(status_code=400, detail="Motif requis")

    reg = await db.registrations.find_one({"registration_id": registration_id}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Inscription non trouvee")
    if reg.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Non autorise")
    if reg.get("payment_status") == "refunded":
        raise HTTPException(status_code=400, detail="Deja rembourse")

    existing = await db.refund_requests.find_one({
        "registration_id": registration_id,
        "status": {"$in": ["pending", "approved"]}
    })
    if existing:
        raise HTTPException(status_code=409, detail="Demande de remboursement deja en cours")

    event = await db.events.find_one({"event_id": reg.get("event_id")}, {"_id": 0, "title": 1, "organizer_id": 1})

    refund = {
        "refund_id": f"ref_{uuid.uuid4().hex[:12]}",
        "registration_id": registration_id,
        "event_id": reg.get("event_id", ""),
        "event_title": event.get("title", "") if event else "",
        "user_id": current_user["user_id"],
        "user_name": current_user["name"],
        "user_email": current_user.get("email", ""),
        "amount": reg.get("amount_paid", 0),
        "reason": reason[:500],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.refund_requests.insert_one(refund)
    del refund["_id"]

    # Notify admin
    from routers.notifications import create_notification
    admin_users = await db.users.find({"role": "admin"}, {"_id": 0, "user_id": 1}).to_list(10)
    for admin in admin_users:
        await create_notification(
            admin["user_id"], "refund_request",
            "Demande de remboursement",
            f"{current_user['name']} demande un remboursement pour {event.get('title', '') if event else 'un evenement'}",
            "/admin"
        )

    # Notify organizer
    if event and event.get("organizer_id"):
        await create_notification(
            event["organizer_id"], "refund_request",
            "Demande de remboursement",
            f"{current_user['name']} demande un remboursement pour {event.get('title', '')}",
            "/organizer"
        )

    return {"refund": refund, "message": "Demande de remboursement envoyee"}


@router.get("/refunds/my")
async def get_my_refund_requests(current_user: dict = Depends(get_current_user)):
    """Get participant's own refund requests."""
    refunds = await db.refund_requests.find(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"refunds": refunds}


@router.get("/admin/refunds/all")
async def get_all_refund_requests(current_user: dict = Depends(get_current_user)):
    """Admin: get all refund requests with details."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    refunds = await db.refund_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"refunds": refunds}


@router.put("/admin/refunds/{refund_id}/process")
async def process_refund_request(refund_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Admin: approve or reject a refund request."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    data = await request.json()
    status = data.get("status")
    admin_note = data.get("admin_note", "")
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Statut invalide (approved/rejected)")

    refund = await db.refund_requests.find_one({"refund_id": refund_id}, {"_id": 0})
    if not refund:
        raise HTTPException(status_code=404, detail="Demande non trouvee")

    await db.refund_requests.update_one(
        {"refund_id": refund_id},
        {"$set": {
            "status": status,
            "admin_note": admin_note,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "processed_by": current_user["user_id"]
        }}
    )

    if status == "approved":
        await db.registrations.update_one(
            {"registration_id": refund["registration_id"]},
            {"$set": {"payment_status": "refunded", "status": "cancelled"}}
        )

    # Notify user
    from routers.notifications import create_notification
    msg = "Votre demande de remboursement a ete approuvee" if status == "approved" else "Votre demande de remboursement a ete refusee"
    await create_notification(
        refund["user_id"], "refund_processed",
        "Remboursement " + ("approuve" if status == "approved" else "refuse"),
        msg,
        "/dashboard"
    )

    return {"message": f"Remboursement {status}"}
