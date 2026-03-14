from fastapi import APIRouter, HTTPException, Depends
from deps import db, get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


@router.get("/organizer/analytics")
async def get_organizer_analytics(current_user: dict = Depends(get_current_user)):
    """Get advanced analytics for organizer."""
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")

    user_id = current_user["user_id"]
    events = await db.events.find({"organizer_id": user_id}, {"_id": 0}).to_list(100)
    event_ids = [e["event_id"] for e in events]

    # Registrations stats
    all_regs = await db.registrations.find(
        {"event_id": {"$in": event_ids}}, {"_id": 0}
    ).to_list(10000)

    total_registrations = len(all_regs)
    total_revenue = sum(r.get("amount_paid", 0) for r in all_regs)
    checked_in = sum(1 for r in all_regs if r.get("checked_in"))

    # Per-event breakdown
    events_stats = []
    for evt in events:
        evt_regs = [r for r in all_regs if r.get("event_id") == evt["event_id"]]
        evt_revenue = sum(r.get("amount_paid", 0) for r in evt_regs)
        evt_checkin = sum(1 for r in evt_regs if r.get("checked_in"))

        # Race breakdown
        race_stats = {}
        for r in evt_regs:
            race = r.get("selected_race", "Non specifie")
            if race not in race_stats:
                race_stats[race] = {"name": race, "count": 0, "revenue": 0}
            race_stats[race]["count"] += 1
            race_stats[race]["revenue"] += r.get("amount_paid", 0)

        events_stats.append({
            "event_id": evt["event_id"],
            "title": evt.get("title", ""),
            "date": evt.get("date", ""),
            "location": evt.get("location", ""),
            "registrations": len(evt_regs),
            "revenue": round(evt_revenue, 2),
            "checked_in": evt_checkin,
            "checkin_rate": round(evt_checkin / len(evt_regs) * 100, 1) if evt_regs else 0,
            "races": list(race_stats.values()),
            "published": evt.get("published", False)
        })

    # Monthly revenue trend
    monthly = {}
    for r in all_regs:
        try:
            dt = datetime.fromisoformat(r.get("created_at", "").replace("Z", "+00:00"))
            key = dt.strftime("%Y-%m")
            if key not in monthly:
                monthly[key] = {"month": key, "registrations": 0, "revenue": 0}
            monthly[key]["registrations"] += 1
            monthly[key]["revenue"] += r.get("amount_paid", 0)
        except (ValueError, AttributeError):
            pass

    # Tshirt size distribution
    sizes = {}
    for r in all_regs:
        sz = r.get("tshirt_size", "")
        if sz:
            sizes[sz] = sizes.get(sz, 0) + 1

    # Orders stats
    orders = await db.orders.find({"organizer_id": user_id}, {"_id": 0}).to_list(1000)
    shop_revenue = sum(o.get("total", 0) for o in orders)

    return {
        "overview": {
            "total_events": len(events),
            "total_registrations": total_registrations,
            "total_revenue": round(total_revenue, 2),
            "shop_revenue": round(shop_revenue, 2),
            "checked_in": checked_in,
            "checkin_rate": round(checked_in / total_registrations * 100, 1) if total_registrations > 0 else 0
        },
        "events": sorted(events_stats, key=lambda x: x.get("date", ""), reverse=True),
        "monthly_trend": sorted(monthly.values(), key=lambda x: x["month"]),
        "tshirt_distribution": [{"size": k, "count": v} for k, v in sorted(sizes.items())],
        "total_orders": len(orders)
    }
