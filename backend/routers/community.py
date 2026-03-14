from fastapi import APIRouter, HTTPException, Depends, Request, Query
from deps import db, get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


# ============== EVENT COMMUNITY POSTS ==============

@router.get("/events/{event_id}/community")
async def get_community_posts(event_id: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50)):
    """Get community posts for an event (public)."""
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0, "title": 1})
    if not event:
        raise HTTPException(status_code=404, detail="Evenement non trouve")
    skip = (page - 1) * limit
    total = await db.community_posts.count_documents({"event_id": event_id})
    posts = await db.community_posts.find(
        {"event_id": event_id}, {"_id": 0}
    ).sort("pinned", -1).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    # Fetch reply counts
    for post in posts:
        post["reply_count"] = await db.community_replies.count_documents({"post_id": post["post_id"]})

    return {"posts": posts, "total": total, "page": page}


@router.post("/events/{event_id}/community")
async def create_community_post(event_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Create a community post on an event."""
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0, "organizer_id": 1})
    if not event:
        raise HTTPException(status_code=404, detail="Evenement non trouve")

    data = await request.json()
    content = data.get("content", "").strip()
    if not content or len(content) < 3:
        raise HTTPException(status_code=400, detail="Contenu requis (min 3 caractères)")

    is_organizer = current_user["user_id"] == event.get("organizer_id") or current_user["role"] == "admin"

    post = {
        "post_id": f"post_{uuid.uuid4().hex[:12]}",
        "event_id": event_id,
        "author_id": current_user["user_id"],
        "author_name": current_user.get("company_name") or current_user["name"],
        "author_role": current_user["role"],
        "content": content[:2000],
        "pinned": False,
        "is_organizer": is_organizer,
        "likes": 0,
        "liked_by": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.community_posts.insert_one(post)
    del post["_id"]
    post["reply_count"] = 0
    return {"post": post}


@router.delete("/community/posts/{post_id}")
async def delete_community_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a community post (author or admin only)."""
    post = await db.community_posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post non trouve")
    if post["author_id"] != current_user["user_id"] and current_user["role"] != "admin":
        event = await db.events.find_one({"event_id": post["event_id"]}, {"_id": 0, "organizer_id": 1})
        if not event or event.get("organizer_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Non autorise")
    await db.community_posts.delete_one({"post_id": post_id})
    await db.community_replies.delete_many({"post_id": post_id})
    return {"message": "Post supprime"}


@router.post("/community/posts/{post_id}/like")
async def toggle_like_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle like on a community post."""
    post = await db.community_posts.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post non trouve")
    liked_by = post.get("liked_by", [])
    if current_user["user_id"] in liked_by:
        await db.community_posts.update_one(
            {"post_id": post_id},
            {"$pull": {"liked_by": current_user["user_id"]}, "$inc": {"likes": -1}}
        )
        return {"liked": False}
    else:
        await db.community_posts.update_one(
            {"post_id": post_id},
            {"$push": {"liked_by": current_user["user_id"]}, "$inc": {"likes": 1}}
        )
        return {"liked": True}


@router.put("/community/posts/{post_id}/pin")
async def toggle_pin_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Pin/unpin a post (organizer or admin only)."""
    post = await db.community_posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post non trouve")
    event = await db.events.find_one({"event_id": post["event_id"]}, {"_id": 0, "organizer_id": 1})
    if not event:
        raise HTTPException(status_code=404, detail="Evenement non trouve")
    if event.get("organizer_id") != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Organisateur requis")
    new_pinned = not post.get("pinned", False)
    await db.community_posts.update_one({"post_id": post_id}, {"$set": {"pinned": new_pinned}})
    return {"pinned": new_pinned}


# ============== REPLIES ==============

@router.get("/community/posts/{post_id}/replies")
async def get_post_replies(post_id: str):
    """Get replies for a specific post."""
    replies = await db.community_replies.find(
        {"post_id": post_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return {"replies": replies}


@router.post("/community/posts/{post_id}/replies")
async def create_reply(post_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Reply to a community post."""
    post = await db.community_posts.find_one({"post_id": post_id}, {"_id": 0, "event_id": 1, "author_id": 1})
    if not post:
        raise HTTPException(status_code=404, detail="Post non trouve")

    data = await request.json()
    content = data.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Contenu requis")

    event = await db.events.find_one({"event_id": post["event_id"]}, {"_id": 0, "organizer_id": 1})
    is_organizer = current_user["user_id"] == event.get("organizer_id") if event else False

    reply = {
        "reply_id": f"reply_{uuid.uuid4().hex[:12]}",
        "post_id": post_id,
        "author_id": current_user["user_id"],
        "author_name": current_user.get("company_name") or current_user["name"],
        "author_role": current_user["role"],
        "is_organizer": is_organizer,
        "content": content[:1000],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.community_replies.insert_one(reply)
    del reply["_id"]

    # Notify post author if different user
    if post["author_id"] != current_user["user_id"]:
        from routers.notifications import create_notification
        await create_notification(
            post["author_id"], "community_reply",
            "Nouvelle reponse",
            f"{current_user['name']} a repondu a votre message",
            f"/events/{post['event_id']}"
        )

    return {"reply": reply}


@router.delete("/community/replies/{reply_id}")
async def delete_reply(reply_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a reply (author or admin only)."""
    reply = await db.community_replies.find_one({"reply_id": reply_id}, {"_id": 0})
    if not reply:
        raise HTTPException(status_code=404, detail="Reponse non trouvee")
    if reply["author_id"] != current_user["user_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Non autorise")
    await db.community_replies.delete_one({"reply_id": reply_id})
    return {"message": "Reponse supprimee"}
