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


@router.get("/admin/commissions")
async def get_admin_commissions(current_user: dict = Depends(get_current_user)):
    """Get admin commission stats from provider product sales (1€ per product sold)."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")

    orders = await db.orders.find(
        {"provider_ids": {"$exists": True, "$ne": []}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10000)

    total_admin_commission = 0
    total_provider_items = 0
    by_provider = {}
    orders_detail = []

    for o in orders:
        order_admin_commission = o.get("admin_commission_total", 0)
        # Fallback: calculate from items if admin_commission_total not yet stored
        if order_admin_commission == 0:
            for item in o.get("items", []):
                if item.get("provider_id"):
                    order_admin_commission += 1.0 * item.get("quantity", 1)

        if order_admin_commission > 0:
            total_admin_commission += order_admin_commission

            # Count provider items
            for item in o.get("items", []):
                if item.get("provider_id"):
                    qty = item.get("quantity", 1)
                    total_provider_items += qty
                    pid = item["provider_id"]
                    if pid not in by_provider:
                        by_provider[pid] = {"provider_id": pid, "name": "", "items_sold": 0, "commission": 0, "orders_count": 0}
                    by_provider[pid]["items_sold"] += qty
                    by_provider[pid]["commission"] += 1.0 * qty

            # Track unique orders per provider
            for pid in o.get("provider_ids", []):
                if pid in by_provider:
                    by_provider[pid]["orders_count"] += 1

            orders_detail.append({
                "order_id": o.get("order_id"),
                "user_name": o.get("user_name", ""),
                "event_id": o.get("event_id", ""),
                "total": o.get("total", 0),
                "admin_commission": order_admin_commission,
                "created_at": o.get("created_at", "")
            })

    # Enrich provider names
    for pid, info in by_provider.items():
        p = await db.users.find_one({"user_id": pid}, {"_id": 0, "name": 1, "company_name": 1})
        if p:
            info["name"] = p.get("company_name") or p.get("name", "")
        info["commission"] = round(info["commission"], 2)

    return {
        "total_admin_commission": round(total_admin_commission, 2),
        "total_provider_items_sold": total_provider_items,
        "total_orders_with_provider": len(orders_detail),
        "by_provider": list(by_provider.values()),
        "recent_orders": orders_detail[:20]
    }


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


@router.get("/admin/revenue-breakdown")
async def get_revenue_breakdown(current_user: dict = Depends(get_current_user)):
    """Complete revenue breakdown by source with monthly evolution."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")

    # 1. Inscriptions (registration payments)
    reg_payments = await db.payment_transactions.find(
        {"registration_id": {"$exists": True, "$ne": ""}, "payment_status": "completed"},
        {"_id": 0}
    ).to_list(10000)
    inscriptions_total = round(sum(p.get("amount", 0) for p in reg_payments), 2)
    inscriptions_fees = round(sum(p.get("service_fee", 0) for p in reg_payments), 2)
    inscriptions_count = len(reg_payments)

    # 2. Donations (sponsors with type Donateur, paid)
    donations = await db.sponsors.find({"sponsor_type": "Donateur", "payment_status": "paid"}, {"_id": 0}).to_list(1000)
    donations_total = round(sum(d.get("base_amount", d.get("amount", 0)) for d in donations), 2)
    donations_fees = round(sum(d.get("platform_fee", 0) for d in donations), 2)
    donations_count = len(donations)
    # Also pending
    donations_pending = await db.sponsors.find({"sponsor_type": "Donateur", "payment_link": {"$exists": True, "$ne": ""}, "payment_status": {"$ne": "paid"}}, {"_id": 0}).to_list(1000)
    donations_pending_total = round(sum(d.get("base_amount", d.get("amount", 0)) for d in donations_pending), 2)

    # 3. Sponsors (type Sponsor or Mecene, paid)
    sponsors = await db.sponsors.find({"sponsor_type": {"$in": ["Sponsor", "Mecene"]}, "payment_status": "paid"}, {"_id": 0}).to_list(1000)
    sponsors_total = round(sum(s.get("base_amount", s.get("amount", 0)) for s in sponsors), 2)
    sponsors_fees = round(sum(s.get("platform_fee", 0) for s in sponsors), 2)
    sponsors_count = len(sponsors)
    sponsors_pending = await db.sponsors.find({"sponsor_type": {"$in": ["Sponsor", "Mecene"]}, "payment_link": {"$exists": True, "$ne": ""}, "payment_status": {"$ne": "paid"}}, {"_id": 0}).to_list(1000)
    sponsors_pending_total = round(sum(s.get("base_amount", s.get("amount", 0)) for s in sponsors_pending), 2)

    # 4. Product sales (shop orders)
    orders = await db.orders.find({"payment_status": {"$in": ["completed", "paid"]}}, {"_id": 0}).to_list(10000)
    products_total = round(sum(o.get("total", 0) for o in orders), 2)
    products_count = len(orders)
    products_commission = round(sum(o.get("admin_commission_total", 0) for o in orders), 2)

    # 5. Platform commissions total (from commissions collection)
    all_commissions = await db.commissions.find({}, {"_id": 0}).to_list(10000)
    platform_fees_collected = round(sum(c.get("commission_amount", 0) for c in all_commissions if c.get("status") == "collected"), 2)
    platform_fees_pending = round(sum(c.get("commission_amount", 0) for c in all_commissions if c.get("status") == "pending"), 2)

    # 6. Subscriptions placeholder
    subscriptions_total = 0
    subscriptions_count = 0

    # Grand total
    grand_total = inscriptions_total + donations_total + sponsors_total + products_total + subscriptions_total
    grand_fees = inscriptions_fees + donations_fees + sponsors_fees + products_commission

    # Monthly evolution (last 12 months)
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    monthly = []
    for i in range(11, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            month_end = (month_start + timedelta(days=32)).replace(day=1)
        else:
            month_end = now
        m_label = month_start.strftime("%b %Y")
        m_iso_start = month_start.isoformat()
        m_iso_end = month_end.isoformat()

        # Inscriptions this month
        m_insc = sum(p.get("amount", 0) for p in reg_payments if m_iso_start <= p.get("created_at", "") < m_iso_end)
        # Donations
        m_don = sum(d.get("base_amount", d.get("amount", 0)) for d in donations if m_iso_start <= d.get("paid_at", d.get("created_at", "")) < m_iso_end)
        # Sponsors
        m_spon = sum(s.get("base_amount", s.get("amount", 0)) for s in sponsors if m_iso_start <= s.get("paid_at", s.get("created_at", "")) < m_iso_end)
        # Products
        m_prod = sum(o.get("total", 0) for o in orders if m_iso_start <= o.get("created_at", "") < m_iso_end)
        # Fees
        m_fees = sum(c.get("commission_amount", 0) for c in all_commissions if m_iso_start <= c.get("created_at", "") < m_iso_end)

        monthly.append({
            "month": m_label,
            "inscriptions": round(m_insc, 2),
            "dons": round(m_don, 2),
            "sponsors": round(m_spon, 2),
            "produits": round(m_prod, 2),
            "frais_plateforme": round(m_fees, 2),
            "total": round(m_insc + m_don + m_spon + m_prod, 2)
        })

    # Recent transactions (mixed, sorted by date)
    recent = []
    for p in sorted(reg_payments, key=lambda x: x.get("created_at", ""), reverse=True)[:5]:
        recent.append({"type": "inscription", "label": f"Inscription - {p.get('event_title', p.get('event_id', ''))}", "amount": p.get("amount", 0), "fee": p.get("service_fee", 0), "date": p.get("created_at", ""), "status": "completed"})
    for d in sorted(donations + donations_pending, key=lambda x: x.get("paid_at", x.get("created_at", "")), reverse=True)[:5]:
        recent.append({"type": "don", "label": f"Don - {d.get('name', '')}", "amount": d.get("base_amount", d.get("amount", 0)), "fee": d.get("platform_fee", 0), "date": d.get("paid_at", d.get("created_at", "")), "status": d.get("payment_status", "pending")})
    for s in sorted(sponsors + sponsors_pending, key=lambda x: x.get("paid_at", x.get("created_at", "")), reverse=True)[:5]:
        recent.append({"type": "sponsor", "label": f"Sponsor - {s.get('name', '')}", "amount": s.get("base_amount", s.get("amount", 0)), "fee": s.get("platform_fee", 0), "date": s.get("paid_at", s.get("created_at", "")), "status": s.get("payment_status", "pending")})
    for o in sorted(orders, key=lambda x: x.get("created_at", ""), reverse=True)[:5]:
        recent.append({"type": "produit", "label": f"Vente - Commande {o.get('order_id', '')[:12]}", "amount": o.get("total", 0), "fee": o.get("admin_commission_total", 0), "date": o.get("created_at", ""), "status": "completed"})
    recent.sort(key=lambda x: x.get("date", ""), reverse=True)

    return {
        "sources": {
            "inscriptions": {"total": inscriptions_total, "fees": inscriptions_fees, "count": inscriptions_count, "label": "Inscriptions evenements"},
            "dons": {"total": donations_total, "fees": donations_fees, "count": donations_count, "pending_total": donations_pending_total, "pending_count": len(donations_pending), "label": "Dons"},
            "sponsors": {"total": sponsors_total, "fees": sponsors_fees, "count": sponsors_count, "pending_total": sponsors_pending_total, "pending_count": len(sponsors_pending), "label": "Sponsors & Mecenes"},
            "produits": {"total": products_total, "fees": products_commission, "count": products_count, "label": "Produits derives"},
            "abonnements": {"total": subscriptions_total, "fees": 0, "count": subscriptions_count, "label": "Abonnements partenaires"}
        },
        "grand_total": round(grand_total, 2),
        "grand_fees": round(grand_fees, 2),
        "platform_fees_collected": platform_fees_collected,
        "platform_fees_pending": platform_fees_pending,
        "monthly": monthly,
        "recent_transactions": recent[:20]
    }
