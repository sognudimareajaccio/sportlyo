from fastapi import APIRouter, HTTPException, Depends, Request
from deps import db, get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


@router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find(
        {"user_id": current_user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    unread = sum(1 for n in notifs if not n.get("read"))
    return {"notifications": notifs, "unread_count": unread}


@router.post("/notifications/read")
async def mark_notifications_read(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    ids = data.get("notification_ids", [])
    if ids:
        await db.notifications.update_many(
            {"notification_id": {"$in": ids}, "user_id": current_user["user_id"]},
            {"$set": {"read": True}}
        )
    else:
        await db.notifications.update_many(
            {"user_id": current_user["user_id"], "read": False},
            {"$set": {"read": True}}
        )
    return {"message": "Notifications marquées comme lues"}


@router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents(
        {"user_id": current_user["user_id"], "read": False}
    )
    return {"unread_count": count}


async def create_notification(user_id: str, notif_type: str, title: str, message: str, link: str = ""):
    notif = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notif)
