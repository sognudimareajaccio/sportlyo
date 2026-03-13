from fastapi import APIRouter, Depends
from deps import db, get_current_user, EMERGENT_LLM_KEY
from models import ChatRequest
import uuid
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.post("/chat")
async def chat_with_ai(chat_request: ChatRequest, current_user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        return {"response": "AI service not configured. Please contact support."}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        session_id = chat_request.session_id or f"chat_{current_user['user_id']}_{uuid.uuid4().hex[:8]}"
        events = await db.events.find({"status": "active"}, {"_id": 0}).limit(10).to_list(10)
        events_context = "\n".join([f"- {e['title']} ({e['sport_type']}) - {e['location']} - {e['date'][:10]} - {e.get('price', 0)}EUR" for e in events])
        system_message = f"""Tu es Coach AI, l'assistant virtuel de SportLyo, une plateforme de reservation d'evenements sportifs.

Tu aides les participants a:
- Trouver des evenements adaptes a leur niveau et preferences
- Comprendre les parcours, distances et deniveles
- Repondre aux questions sur les inscriptions, PPS, et paiements
- Donner des conseils d'entrainement personnalises
- Expliquer le Pass Prevention Sante (PPS) obligatoire pour les courses

Evenements disponibles:
{events_context}

Sois motivant, professionnel et concis. Reponds en francais."""
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_message).with_model("openai", "gpt-5.2")
        user_message = UserMessage(text=chat_request.message)
        response = await chat.send_message(user_message)
        await db.chat_history.insert_one({"session_id": session_id, "user_id": current_user['user_id'], "role": "user", "content": chat_request.message, "timestamp": datetime.now(timezone.utc).isoformat()})
        await db.chat_history.insert_one({"session_id": session_id, "user_id": current_user['user_id'], "role": "assistant", "content": response, "timestamp": datetime.now(timezone.utc).isoformat()})
        return {"response": response, "session_id": session_id}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": "Desole, je ne peux pas repondre pour le moment. Veuillez reessayer.", "error": str(e)}


@router.get("/recommendations")
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    registrations = await db.registrations.find({"user_id": current_user['user_id']}, {"_id": 0}).to_list(50)
    sport_preferences = {}
    for reg in registrations:
        event = await db.events.find_one({"event_id": reg['event_id']}, {"_id": 0})
        if event:
            sport_type = event.get('sport_type', 'running')
            sport_preferences[sport_type] = sport_preferences.get(sport_type, 0) + 1
    if sport_preferences:
        favorite_sport = max(sport_preferences, key=sport_preferences.get)
        events = await db.events.find({"status": "active", "sport_type": favorite_sport}, {"_id": 0}).sort("date", 1).limit(6).to_list(6)
    else:
        events = await db.events.find({"status": "active"}, {"_id": 0}).sort("current_participants", -1).limit(6).to_list(6)
    return {"recommendations": events, "based_on": sport_preferences}
