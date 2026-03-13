from fastapi import APIRouter, HTTPException, Depends, Query, Request
from deps import db, get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


@router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    total_users = await db.users.count_documents({})
    total_events = await db.events.count_documents({})
    total_registrations = await db.registrations.count_documents({})
    payments = await db.payment_transactions.find({"payment_status": "completed"}, {"_id": 0}).to_list(10000)
    total_revenue = sum(p.get('amount', 0) for p in payments)
    total_service_fees = sum(p.get('service_fee', 0) for p in payments)
    total_stripe_fees = sum(p.get('stripe_fee', 0) for p in payments)
    total_platform_net = sum(p.get('platform_net', 0) for p in payments)
    total_organizer = sum(p.get('organizer_amount', 0) for p in payments)
    recent_registrations = await db.registrations.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    return {
        "total_users": total_users, "total_events": total_events,
        "total_registrations": total_registrations, "total_revenue": total_revenue,
        "total_service_fees": total_service_fees, "total_stripe_fees": total_stripe_fees,
        "total_platform_net": total_platform_net, "total_organizer": total_organizer,
        "recent_registrations": recent_registrations
    }


@router.get("/admin/users")
async def get_all_users(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    skip = (page - 1) * limit
    total = await db.users.count_documents({})
    users = await db.users.find({}, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    data = await request.json()
    new_role = data.get('role')
    if new_role not in ['participant', 'organizer', 'admin', 'provider']:
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": new_role}})
    return {"message": "Role updated"}


@router.get("/admin/payments")
async def get_all_payments(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), event_id: str = Query(None), current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    skip = (page - 1) * limit
    query = {}
    if event_id:
        query["event_id"] = event_id
    total = await db.payment_transactions.count_documents(query)
    payments = await db.payment_transactions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for p in payments:
        reg = await db.registrations.find_one({"registration_id": p.get("registration_id")}, {"_id": 0})
        if reg:
            p["user_name"] = reg.get("user_name", "")
            p["user_email"] = reg.get("user_email", "")
            p["selected_race"] = reg.get("selected_race", "")
        event = await db.events.find_one({"event_id": p.get("event_id")}, {"_id": 0, "title": 1, "organizer_name": 1})
        if event:
            p["event_title"] = event.get("title", "")
            p["organizer_name"] = event.get("organizer_name", "")
    totals_query = {"payment_status": "completed"}
    if event_id:
        totals_query["event_id"] = event_id
    all_completed = await db.payment_transactions.find(totals_query, {"_id": 0}).to_list(10000)
    totals = {
        "total_base_price": round(sum(t.get('base_price', t.get('organizer_amount', 0)) for t in all_completed), 2),
        "total_service_fees": round(sum(t.get('service_fee', 0) for t in all_completed), 2),
        "total_amount": round(sum(t.get('amount', 0) for t in all_completed), 2),
        "total_stripe_fees": round(sum(t.get('stripe_fee', 0) for t in all_completed), 2),
        "total_platform_net": round(sum(t.get('platform_net', 0) for t in all_completed), 2),
        "total_organizer": round(sum(t.get('organizer_amount', t.get('base_price', 0)) for t in all_completed), 2),
        "total_completed": len(all_completed)
    }
    return {"payments": payments, "totals": totals, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/admin/messages")
async def get_admin_messages(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin requis")
    messages = await db.admin_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"messages": messages}


@router.get("/admin/refunds")
async def get_refund_requests(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    refunds = await db.refund_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"refunds": refunds}


@router.put("/admin/refunds/{refund_id}")
async def process_refund(refund_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    data = await request.json()
    status = data.get('status')
    await db.refund_requests.update_one(
        {"refund_id": refund_id},
        {"$set": {"status": status, "processed_at": datetime.now(timezone.utc).isoformat(), "processed_by": current_user['user_id']}}
    )
    if status == 'approved':
        refund = await db.refund_requests.find_one({"refund_id": refund_id}, {"_id": 0})
        await db.registrations.update_one(
            {"registration_id": refund['registration_id']},
            {"$set": {"payment_status": "refunded", "status": "cancelled"}}
        )
    return {"message": f"Refund {status}"}
