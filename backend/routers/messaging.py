from fastapi import APIRouter, HTTPException, Depends, Request
from deps import db, get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    user_id = current_user['user_id']
    convos = await db.conversations.find({"participants": user_id}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    for convo in convos:
        unread = await db.messages.count_documents({
            "conversation_id": convo["conversation_id"],
            "sender_id": {"$ne": user_id}, "read": False
        })
        convo["unread_count"] = unread
    return {"conversations": convos}


@router.post("/conversations")
async def create_conversation(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    target_user_id = data.get("target_user_id")
    subject = data.get("subject", "")
    if not target_user_id:
        raise HTTPException(status_code=400, detail="target_user_id requis")
    target_user = await db.users.find_one({"user_id": target_user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    existing = await db.conversations.find_one(
        {"participants": {"$all": [current_user["user_id"], target_user_id]}}, {"_id": 0}
    )
    if existing:
        return {"conversation": existing, "created": False}

    convo_id = f"conv_{uuid.uuid4().hex[:12]}"
    convo = {
        "conversation_id": convo_id,
        "participants": [current_user["user_id"], target_user_id],
        "participant_names": {current_user["user_id"]: current_user["name"], target_user_id: target_user["name"]},
        "participant_roles": {current_user["user_id"]: current_user["role"], target_user_id: target_user["role"]},
        "subject": subject, "last_message": "",
        "last_message_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.conversations.insert_one(convo)
    del convo["_id"]
    return {"conversation": convo, "created": True}


@router.get("/conversations/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    convo_ids = []
    async for convo in db.conversations.find({"participants": user_id}, {"conversation_id": 1}):
        convo_ids.append(convo["conversation_id"])
    if not convo_ids:
        return {"unread_count": 0}
    count = await db.messages.count_documents({
        "conversation_id": {"$in": convo_ids},
        "sender_id": {"$ne": user_id}, "read": False
    })
    return {"unread_count": count}


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, current_user: dict = Depends(get_current_user)):
    convo = await db.conversations.find_one({"conversation_id": conversation_id}, {"_id": 0})
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation non trouvee")
    if current_user["user_id"] not in convo["participants"]:
        raise HTTPException(status_code=403, detail="Acces non autorise")
    msgs = await db.messages.find({"conversation_id": conversation_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    await db.messages.update_many(
        {"conversation_id": conversation_id, "sender_id": {"$ne": current_user["user_id"]}, "read": False},
        {"$set": {"read": True}}
    )
    return {"messages": msgs, "conversation": convo}


@router.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    convo = await db.conversations.find_one({"conversation_id": conversation_id}, {"_id": 0})
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation non trouvee")
    if current_user["user_id"] not in convo["participants"]:
        raise HTTPException(status_code=403, detail="Acces non autorise")
    data = await request.json()
    content = data.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message vide")
    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "conversation_id": conversation_id,
        "sender_id": current_user["user_id"], "sender_name": current_user["name"],
        "sender_role": current_user["role"], "content": content,
        "read": False, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(msg)
    del msg["_id"]
    await db.conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": {"last_message": content[:100], "last_message_at": msg["created_at"], "updated_at": msg["created_at"]}}
    )
    return {"message": msg}


@router.get("/admin/organizers")
async def get_organizers_list(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin requis")
    organizers = await db.users.find({"role": "organizer"}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "company_name": 1}).to_list(200)
    return {"organizers": organizers}


@router.get("/messaging/admins")
async def get_admins_list(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["organizer", "admin"]:
        raise HTTPException(status_code=403, detail="Acces non autorise")
    admins = await db.users.find({"role": "admin"}, {"_id": 0, "user_id": 1, "name": 1, "email": 1}).to_list(20)
    return {"admins": admins}
