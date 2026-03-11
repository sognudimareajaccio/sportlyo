from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import random
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'sportsconnect-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI(title="SportsConnect API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    user_id: str
    role: str = "participant"  # participant, organizer, admin
    created_at: datetime
    picture: Optional[str] = None
    iban: Optional[str] = None

class OrganizerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    company_name: str
    description: Optional[str] = None
    iban: Optional[str] = None
    verified: bool = False

class EventCreate(BaseModel):
    title: str
    description: str
    sport_type: str  # cycling, triathlon, running, walking, motorsport
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date: datetime
    end_date: Optional[datetime] = None
    max_participants: int
    price: float
    distances: List[str] = []  # e.g., ["10km", "21km", "42km"]
    elevation_gain: Optional[int] = None
    image_url: Optional[str] = None
    route_data: Optional[dict] = None

class Event(EventCreate):
    event_id: str
    organizer_id: str
    organizer_name: str
    created_at: datetime
    current_participants: int = 0
    status: str = "active"  # active, cancelled, completed

class RegistrationCreate(BaseModel):
    event_id: str
    selected_distance: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None

class Registration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    registration_id: str
    event_id: str
    user_id: str
    user_name: str
    user_email: str
    bib_number: str
    selected_distance: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    payment_status: str = "pending"  # pending, completed, refunded
    payment_id: Optional[str] = None
    amount_paid: float = 0
    platform_fee: float = 0
    organizer_amount: float = 0
    created_at: datetime
    status: str = "confirmed"  # confirmed, cancelled

class ChatMessage(BaseModel):
    role: str  # user, assistant
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class PaymentCreate(BaseModel):
    registration_id: str
    amount: float

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        # Check cookie
        token = request.cookies.get('session_token')
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
    else:
        token = auth_header.split(' ')[1]
    
    payload = decode_token(token)
    user = await db.users.find_one({"user_id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def generate_bib_number(event_id: str) -> str:
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"{event_id[:4].upper()}-{random_part}"

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "password": hashed_password,
        "role": "participant",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "picture": None,
        "iban": None
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, "participant")
    
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": "participant"
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get('password', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['user_id'], user['role'])
    
    return {
        "token": token,
        "user": {
            "user_id": user['user_id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role'],
            "picture": user.get('picture')
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user['user_id'],
        "email": current_user['email'],
        "name": current_user['name'],
        "role": current_user['role'],
        "phone": current_user.get('phone'),
        "picture": current_user.get('picture'),
        "iban": current_user.get('iban')
    }

# Emergent OAuth Session Handler
@api_router.post("/auth/session")
async def handle_oauth_session(request: Request):
    """Process session_id from Emergent OAuth"""
    import httpx
    
    body = await request.json()
    session_id = body.get('session_id')
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client_http:
        response = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        oauth_data = response.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": oauth_data['email']}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user['user_id']
        role = existing_user['role']
        # Update picture if changed
        if oauth_data.get('picture') != existing_user.get('picture'):
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"picture": oauth_data.get('picture')}}
            )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = "participant"
        user_doc = {
            "user_id": user_id,
            "email": oauth_data['email'],
            "name": oauth_data['name'],
            "picture": oauth_data.get('picture'),
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "phone": None,
            "iban": None,
            "password": None  # OAuth users don't have password
        }
        await db.users.insert_one(user_doc)
    
    # Create session token
    session_token = create_token(user_id, role)
    
    # Store session
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response = JSONResponse({
        "user": {
            "user_id": user_id,
            "email": oauth_data['email'],
            "name": oauth_data['name'],
            "picture": oauth_data.get('picture'),
            "role": role
        },
        "token": session_token
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    return response

@api_router.post("/auth/logout")
async def logout(request: Request):
    token = request.cookies.get('session_token')
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie("session_token", path="/")
    return response

@api_router.put("/auth/profile")
async def update_profile(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    update_fields = {}
    
    if 'name' in data:
        update_fields['name'] = data['name']
    if 'phone' in data:
        update_fields['phone'] = data['phone']
    if 'iban' in data:
        update_fields['iban'] = data['iban']
    
    if update_fields:
        await db.users.update_one(
            {"user_id": current_user['user_id']},
            {"$set": update_fields}
        )
    
    return {"message": "Profile updated"}

@api_router.put("/auth/role")
async def upgrade_role(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    new_role = data.get('role')
    
    if new_role not in ['organizer']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    await db.users.update_one(
        {"user_id": current_user['user_id']},
        {"$set": {"role": new_role}}
    )
    
    # Create organizer profile
    if new_role == 'organizer':
        await db.organizer_profiles.update_one(
            {"user_id": current_user['user_id']},
            {"$set": {
                "user_id": current_user['user_id'],
                "company_name": data.get('company_name', current_user['name']),
                "description": data.get('description'),
                "iban": data.get('iban'),
                "verified": False
            }},
            upsert=True
        )
    
    return {"message": "Role updated", "role": new_role}

# ============== EVENTS ROUTES ==============

@api_router.get("/events")
async def get_events(
    sport_type: Optional[str] = None,
    location: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50)
):
    query = {"status": "active"}
    
    if sport_type:
        query["sport_type"] = sport_type
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        query.setdefault("date", {})["$lte"] = date_to
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    total = await db.events.count_documents(query)
    events = await db.events.find(query, {"_id": 0}).sort("date", 1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "events": events,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/events/featured")
async def get_featured_events():
    events = await db.events.find(
        {"status": "active"},
        {"_id": 0}
    ).sort("created_at", -1).limit(6).to_list(6)
    return {"events": events}

@api_router.get("/events/{event_id}")
async def get_event(event_id: str):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@api_router.post("/events")
async def create_event(event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Only organizers can create events")
    
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    
    event_doc = {
        "event_id": event_id,
        "organizer_id": current_user['user_id'],
        "organizer_name": current_user['name'],
        **event_data.model_dump(),
        "date": event_data.date.isoformat(),
        "end_date": event_data.end_date.isoformat() if event_data.end_date else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "current_participants": 0,
        "status": "active"
    }
    
    await db.events.insert_one(event_doc)
    if '_id' in event_doc:
        del event_doc['_id']
    return event_doc

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['organizer_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    data = await request.json()
    if 'date' in data:
        data['date'] = data['date']
    if 'end_date' in data:
        data['end_date'] = data['end_date']
    
    await db.events.update_one(
        {"event_id": event_id},
        {"$set": data}
    )
    
    return {"message": "Event updated"}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['organizer_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.events.update_one(
        {"event_id": event_id},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Event cancelled"}

@api_router.get("/organizer/events")
async def get_organizer_events(current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    events = await db.events.find(
        {"organizer_id": current_user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"events": events}

# ============== REGISTRATIONS ROUTES ==============

@api_router.post("/registrations")
async def create_registration(reg_data: RegistrationCreate, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": reg_data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['current_participants'] >= event['max_participants']:
        raise HTTPException(status_code=400, detail="Event is full")
    
    existing = await db.registrations.find_one({
        "event_id": reg_data.event_id,
        "user_id": current_user['user_id'],
        "status": "confirmed"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already registered")
    
    registration_id = f"reg_{uuid.uuid4().hex[:12]}"
    bib_number = generate_bib_number(reg_data.event_id)
    
    # Calculate fees (5% platform fee)
    platform_fee = round(event['price'] * 0.05, 2)
    organizer_amount = round(event['price'] - platform_fee, 2)
    
    registration_doc = {
        "registration_id": registration_id,
        "event_id": reg_data.event_id,
        "user_id": current_user['user_id'],
        "user_name": current_user['name'],
        "user_email": current_user['email'],
        "bib_number": bib_number,
        "selected_distance": reg_data.selected_distance,
        "emergency_contact": reg_data.emergency_contact,
        "emergency_phone": reg_data.emergency_phone,
        "payment_status": "pending",
        "payment_id": None,
        "amount_paid": event['price'],
        "platform_fee": platform_fee,
        "organizer_amount": organizer_amount,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "confirmed"
    }
    
    await db.registrations.insert_one(registration_doc)
    
    # Update participant count
    await db.events.update_one(
        {"event_id": reg_data.event_id},
        {"$inc": {"current_participants": 1}}
    )
    
    return {
        "registration_id": registration_id,
        "bib_number": bib_number,
        "amount": event['price'],
        "event_title": event['title']
    }

@api_router.get("/registrations")
async def get_user_registrations(current_user: dict = Depends(get_current_user)):
    registrations = await db.registrations.find(
        {"user_id": current_user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich with event data
    for reg in registrations:
        event = await db.events.find_one({"event_id": reg['event_id']}, {"_id": 0})
        if event:
            reg['event'] = event
    
    return {"registrations": registrations}

@api_router.get("/registrations/{registration_id}")
async def get_registration(registration_id: str, current_user: dict = Depends(get_current_user)):
    registration = await db.registrations.find_one(
        {"registration_id": registration_id},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration['user_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    event = await db.events.find_one({"event_id": registration['event_id']}, {"_id": 0})
    registration['event'] = event
    
    return registration

@api_router.get("/organizer/registrations/{event_id}")
async def get_event_registrations(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['organizer_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    registrations = await db.registrations.find(
        {"event_id": event_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return {"registrations": registrations, "event": event}

# ============== PAYMENT ROUTES (MOCKED) ==============

@api_router.post("/payments/process")
async def process_payment(payment_data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    """
    MOCKED PAYMENT PROCESSING
    In production, integrate with Square API using actual API keys
    """
    registration = await db.registrations.find_one(
        {"registration_id": payment_data.registration_id},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration['user_id'] != current_user['user_id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # MOCK: Simulate payment success
    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    
    await db.registrations.update_one(
        {"registration_id": payment_data.registration_id},
        {"$set": {
            "payment_status": "completed",
            "payment_id": payment_id
        }}
    )
    
    # Record payment for admin tracking
    await db.payments.insert_one({
        "payment_id": payment_id,
        "registration_id": payment_data.registration_id,
        "user_id": current_user['user_id'],
        "amount": payment_data.amount,
        "platform_fee": registration['platform_fee'],
        "organizer_amount": registration['organizer_amount'],
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "payment_id": payment_id,
        "message": "Payment processed successfully (MOCKED)"
    }

# ============== AI CHATBOT ROUTES ==============

@api_router.post("/chat")
async def chat_with_ai(chat_request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """AI Chatbot using OpenAI GPT-5.2 via Emergent LLM Key"""
    
    if not EMERGENT_LLM_KEY:
        return {"response": "AI service not configured. Please contact support."}
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        session_id = chat_request.session_id or f"chat_{current_user['user_id']}_{uuid.uuid4().hex[:8]}"
        
        # Get chat history
        history = await db.chat_history.find(
            {"session_id": session_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(20)
        
        # Build context
        events = await db.events.find({"status": "active"}, {"_id": 0}).limit(10).to_list(10)
        events_context = "\n".join([f"- {e['title']} ({e['sport_type']}) - {e['location']} - {e['date'][:10]} - {e['price']}€" for e in events])
        
        system_message = f"""Tu es Coach AI, l'assistant virtuel de SportsConnect, une plateforme de réservation d'événements sportifs.

Tu aides les participants à:
- Trouver des événements adaptés à leur niveau et préférences
- Comprendre les parcours, distances et dénivelés
- Répondre aux questions sur les inscriptions et paiements
- Donner des conseils d'entraînement personnalisés

Événements disponibles:
{events_context}

Sois motivant, professionnel et concis. Réponds en français."""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=chat_request.message)
        response = await chat.send_message(user_message)
        
        # Save to history
        await db.chat_history.insert_one({
            "session_id": session_id,
            "user_id": current_user['user_id'],
            "role": "user",
            "content": chat_request.message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        await db.chat_history.insert_one({
            "session_id": session_id,
            "user_id": current_user['user_id'],
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {"response": response, "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": "Désolé, je ne peux pas répondre pour le moment. Veuillez réessayer.", "error": str(e)}

@api_router.get("/recommendations")
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    """AI-powered event recommendations based on user history"""
    
    # Get user's past registrations
    registrations = await db.registrations.find(
        {"user_id": current_user['user_id']},
        {"_id": 0}
    ).to_list(50)
    
    # Analyze preferences
    sport_preferences = {}
    for reg in registrations:
        event = await db.events.find_one({"event_id": reg['event_id']}, {"_id": 0})
        if event:
            sport_type = event.get('sport_type', 'running')
            sport_preferences[sport_type] = sport_preferences.get(sport_type, 0) + 1
    
    # Get recommended events
    if sport_preferences:
        favorite_sport = max(sport_preferences, key=sport_preferences.get)
        events = await db.events.find(
            {"status": "active", "sport_type": favorite_sport},
            {"_id": 0}
        ).sort("date", 1).limit(6).to_list(6)
    else:
        events = await db.events.find(
            {"status": "active"},
            {"_id": 0}
        ).sort("current_participants", -1).limit(6).to_list(6)
    
    return {"recommendations": events, "based_on": sport_preferences}

# ============== ADMIN ROUTES ==============

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    total_users = await db.users.count_documents({})
    total_events = await db.events.count_documents({})
    total_registrations = await db.registrations.count_documents({})
    
    # Calculate total revenue
    payments = await db.payments.find({"status": "completed"}, {"_id": 0}).to_list(10000)
    total_revenue = sum(p.get('amount', 0) for p in payments)
    platform_fees = sum(p.get('platform_fee', 0) for p in payments)
    
    # Recent activity
    recent_registrations = await db.registrations.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "total_users": total_users,
        "total_events": total_events,
        "total_registrations": total_registrations,
        "total_revenue": total_revenue,
        "platform_fees": platform_fees,
        "recent_registrations": recent_registrations
    }

@api_router.get("/admin/users")
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    skip = (page - 1) * limit
    total = await db.users.count_documents({})
    users = await db.users.find({}, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    data = await request.json()
    new_role = data.get('role')
    
    if new_role not in ['participant', 'organizer', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": new_role}}
    )
    
    return {"message": "Role updated"}

@api_router.get("/admin/payments")
async def get_all_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    skip = (page - 1) * limit
    total = await db.payments.count_documents({})
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "payments": payments,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

# ============== SPORT CATEGORIES ==============

@api_router.get("/categories")
async def get_categories():
    categories = [
        {"id": "cycling", "name": "Cyclisme", "icon": "bike", "count": 0},
        {"id": "triathlon", "name": "Triathlon", "icon": "medal", "count": 0},
        {"id": "running", "name": "Course à pied", "icon": "footprints", "count": 0},
        {"id": "walking", "name": "Marche", "icon": "walking", "count": 0},
        {"id": "motorsport", "name": "Sports Mécaniques", "icon": "car", "count": 0}
    ]
    
    for cat in categories:
        cat['count'] = await db.events.count_documents({"sport_type": cat['id'], "status": "active"})
    
    return {"categories": categories}

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "SportsConnect API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and add middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
