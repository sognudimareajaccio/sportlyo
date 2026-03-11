from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import random
import string
import base64
import qrcode
from io import BytesIO
import httpx

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

# Stripe API Key
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Platform Commission Rate
PLATFORM_COMMISSION = 0.06  # 6%

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
    birth_date: Optional[str] = None
    gender: Optional[str] = None  # M, F, Other

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    user_id: str
    role: str = "participant"
    created_at: datetime
    picture: Optional[str] = None
    iban: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    pps_number: Optional[str] = None
    pps_valid_until: Optional[str] = None

class OrganizerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    company_name: str
    description: Optional[str] = None
    iban: Optional[str] = None
    stripe_account_id: Optional[str] = None
    verified: bool = False

# Pricing tier for progressive pricing
class PricingTier(BaseModel):
    name: str  # early_bird, standard, late
    price: float
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    max_registrations: Optional[int] = None

# Distance/Race configuration
class RaceConfig(BaseModel):
    name: str  # "10km", "21km", etc.
    price: float
    max_participants: int
    current_participants: int = 0
    elevation_gain: Optional[int] = None
    distance_km: Optional[float] = None

# Wave configuration
class WaveConfig(BaseModel):
    wave_id: str
    name: str  # "Vague 1", "Elite", etc.
    start_time: str
    max_participants: int
    current_participants: int = 0
    race_name: Optional[str] = None

# Custom field for registration form
class CustomField(BaseModel):
    field_id: str
    label: str
    field_type: str  # text, select, checkbox, date, file
    required: bool = False
    options: Optional[List[str]] = None  # For select/checkbox
    conditional_on: Optional[str] = None  # field_id that triggers this
    conditional_value: Optional[str] = None

# Merchandise/Option
class EventOption(BaseModel):
    option_id: str
    name: str
    description: Optional[str] = None
    price: float
    max_quantity: Optional[int] = None
    image_url: Optional[str] = None

class EventCreate(BaseModel):
    title: str
    description: str
    sport_type: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date: datetime
    end_date: Optional[datetime] = None
    max_participants: int
    price: float
    # Advanced fields
    races: Optional[List[RaceConfig]] = None
    waves: Optional[List[WaveConfig]] = None
    pricing_tiers: Optional[List[PricingTier]] = None
    custom_fields: Optional[List[CustomField]] = None
    options: Optional[List[EventOption]] = None
    # Legacy fields
    distances: List[str] = []
    elevation_gain: Optional[int] = None
    image_url: Optional[str] = None
    route_data: Optional[dict] = None
    # Requirements
    requires_pps: bool = False
    requires_medical_cert: bool = False
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    allows_teams: bool = False
    team_min_size: Optional[int] = None
    team_max_size: Optional[int] = None

class Event(EventCreate):
    event_id: str
    organizer_id: str
    organizer_name: str
    created_at: datetime
    current_participants: int = 0
    status: str = "active"

# Team registration
class TeamCreate(BaseModel):
    event_id: str
    team_name: str
    captain_user_id: str
    selected_race: Optional[str] = None

class TeamMember(BaseModel):
    user_id: str
    name: str
    email: str
    role: str = "member"  # captain, member

# Registration with advanced fields
class RegistrationCreate(BaseModel):
    event_id: str
    selected_race: Optional[str] = None
    selected_wave: Optional[str] = None
    selected_options: Optional[List[str]] = None  # option_ids
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    custom_fields_data: Optional[Dict[str, Any]] = None
    team_id: Optional[str] = None
    pps_number: Optional[str] = None

class Registration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    registration_id: str
    event_id: str
    user_id: str
    user_name: str
    user_email: str
    bib_number: str
    selected_race: Optional[str] = None
    selected_wave: Optional[str] = None
    selected_options: Optional[List[str]] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    custom_fields_data: Optional[Dict[str, Any]] = None
    team_id: Optional[str] = None
    payment_status: str = "pending"
    payment_id: Optional[str] = None
    checkout_session_id: Optional[str] = None
    amount_paid: float = 0
    platform_fee: float = 0
    organizer_amount: float = 0
    created_at: datetime
    status: str = "confirmed"
    # Document verification
    pps_number: Optional[str] = None
    pps_verified: bool = False
    medical_cert_url: Optional[str] = None
    medical_cert_verified: bool = False
    # QR code for check-in
    qr_code: Optional[str] = None
    checked_in: bool = False
    checked_in_at: Optional[str] = None
    # Timing
    race_started: bool = False
    race_start_time: Optional[str] = None
    race_finished: bool = False
    race_finish_time: Optional[str] = None
    race_duration_seconds: Optional[int] = None

class PromoCode(BaseModel):
    code: str
    discount_type: str  # percentage, fixed
    discount_value: float
    max_uses: Optional[int] = None
    current_uses: int = 0
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    event_id: Optional[str] = None  # If specific to an event

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

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

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except:
        return None

def generate_bib_number(event_id: str, race_code: str = "") -> str:
    random_part = ''.join(random.choices(string.digits, k=4))
    prefix = race_code[:2].upper() if race_code else event_id[:4].upper()
    return f"{prefix}-{random_part}"

def generate_qr_code(data: str) -> str:
    """Generate QR code as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()

def calculate_age(birth_date: str) -> int:
    """Calculate age from birth date string (YYYY-MM-DD)"""
    try:
        birth = datetime.strptime(birth_date, "%Y-%m-%d")
        today = datetime.now()
        return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
    except:
        return 0

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
        "iban": None,
        "birth_date": user_data.birth_date,
        "gender": user_data.gender,
        "pps_number": None,
        "pps_valid_until": None
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
        "iban": current_user.get('iban'),
        "birth_date": current_user.get('birth_date'),
        "gender": current_user.get('gender'),
        "pps_number": current_user.get('pps_number'),
        "pps_valid_until": current_user.get('pps_valid_until')
    }

@api_router.post("/auth/session")
async def handle_oauth_session(request: Request):
    """Process session_id from Emergent OAuth"""
    body = await request.json()
    session_id = body.get('session_id')
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client_http:
        response = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        oauth_data = response.json()
    
    existing_user = await db.users.find_one({"email": oauth_data['email']}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user['user_id']
        role = existing_user['role']
        if oauth_data.get('picture') != existing_user.get('picture'):
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"picture": oauth_data.get('picture')}}
            )
    else:
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
            "password": None,
            "birth_date": None,
            "gender": None,
            "pps_number": None,
            "pps_valid_until": None
        }
        await db.users.insert_one(user_doc)
    
    session_token = create_token(user_id, role)
    
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
    
    allowed_fields = ['name', 'phone', 'iban', 'birth_date', 'gender', 'pps_number']
    for field in allowed_fields:
        if field in data:
            update_fields[field] = data[field]
    
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
    
    if new_role == 'organizer':
        await db.organizer_profiles.update_one(
            {"user_id": current_user['user_id']},
            {"$set": {
                "user_id": current_user['user_id'],
                "company_name": data.get('company_name', current_user['name']),
                "description": data.get('description'),
                "iban": data.get('iban'),
                "stripe_account_id": None,
                "verified": False
            }},
            upsert=True
        )
    
    return {"message": "Role updated", "role": new_role}

# ============== PPS VERIFICATION ==============

@api_router.post("/pps/verify")
async def verify_pps(request: Request, current_user: dict = Depends(get_current_user)):
    """Verify PPS (Pass Prévention Santé) number"""
    data = await request.json()
    pps_number = data.get('pps_number', '').strip().upper()
    
    if not pps_number:
        raise HTTPException(status_code=400, detail="PPS number required")
    
    # PPS format validation: P + 10 alphanumeric characters
    if not (len(pps_number) >= 10 and pps_number[0] == 'P'):
        raise HTTPException(status_code=400, detail="Invalid PPS format")
    
    # In production, this would call the FFA API
    # For now, we simulate verification
    # PPS is valid for 1 year from issue date
    
    # Simulate verification result
    is_valid = True  # In production, check against FFA database
    valid_until = (datetime.now(timezone.utc) + timedelta(days=365)).strftime("%Y-%m-%d")
    
    if is_valid:
        await db.users.update_one(
            {"user_id": current_user['user_id']},
            {"$set": {
                "pps_number": pps_number,
                "pps_valid_until": valid_until
            }}
        )
        
        return {
            "verified": True,
            "pps_number": pps_number,
            "valid_until": valid_until,
            "message": "PPS vérifié avec succès"
        }
    else:
        raise HTTPException(status_code=400, detail="PPS number not found or expired")

@api_router.get("/pps/status")
async def get_pps_status(current_user: dict = Depends(get_current_user)):
    """Get user's PPS status"""
    pps_number = current_user.get('pps_number')
    pps_valid_until = current_user.get('pps_valid_until')
    
    if not pps_number:
        return {"has_pps": False, "message": "Aucun PPS enregistré"}
    
    if pps_valid_until:
        valid_date = datetime.strptime(pps_valid_until, "%Y-%m-%d")
        is_valid = valid_date > datetime.now()
    else:
        is_valid = False
    
    return {
        "has_pps": True,
        "pps_number": pps_number,
        "valid_until": pps_valid_until,
        "is_valid": is_valid,
        "message": "PPS valide" if is_valid else "PPS expiré"
    }

# ============== EVENTS ROUTES ==============

def get_current_price(event: dict) -> float:
    """Get current price based on pricing tiers"""
    if not event.get('pricing_tiers'):
        return event.get('price', 0)
    
    now = datetime.now(timezone.utc)
    
    for tier in event['pricing_tiers']:
        start = datetime.fromisoformat(tier['start_date']) if tier.get('start_date') else None
        end = datetime.fromisoformat(tier['end_date']) if tier.get('end_date') else None
        
        if start and end and start <= now <= end:
            return tier['price']
        elif start and not end and now >= start:
            return tier['price']
        elif end and not start and now <= end:
            return tier['price']
    
    return event.get('price', 0)

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
    
    if sport_type and sport_type != 'all':
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
    
    # Add current price to each event
    for event in events:
        event['current_price'] = get_current_price(event)
    
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
    
    for event in events:
        event['current_price'] = get_current_price(event)
    
    return {"events": events}

@api_router.get("/events/{event_id}")
async def get_event(event_id: str):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event['current_price'] = get_current_price(event)
    
    # Get race availability
    if event.get('races'):
        for race in event['races']:
            race['available_spots'] = race['max_participants'] - race.get('current_participants', 0)
    
    # Get wave availability
    if event.get('waves'):
        for wave in event['waves']:
            wave['available_spots'] = wave['max_participants'] - wave.get('current_participants', 0)
    
    return event

@api_router.post("/events")
async def create_event(event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Only organizers can create events")
    
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    
    # Process races with IDs
    races = None
    if event_data.races:
        races = []
        for race in event_data.races:
            race_dict = race.model_dump()
            race_dict['race_id'] = f"race_{uuid.uuid4().hex[:8]}"
            races.append(race_dict)
    
    # Process waves with IDs
    waves = None
    if event_data.waves:
        waves = []
        for wave in event_data.waves:
            wave_dict = wave.model_dump()
            wave_dict['wave_id'] = f"wave_{uuid.uuid4().hex[:8]}"
            waves.append(wave_dict)
    
    # Process custom fields with IDs
    custom_fields = None
    if event_data.custom_fields:
        custom_fields = []
        for field in event_data.custom_fields:
            field_dict = field.model_dump()
            field_dict['field_id'] = f"field_{uuid.uuid4().hex[:8]}"
            custom_fields.append(field_dict)
    
    # Process options with IDs
    options = None
    if event_data.options:
        options = []
        for opt in event_data.options:
            opt_dict = opt.model_dump()
            opt_dict['option_id'] = f"opt_{uuid.uuid4().hex[:8]}"
            options.append(opt_dict)
    
    event_doc = {
        "event_id": event_id,
        "organizer_id": current_user['user_id'],
        "organizer_name": current_user['name'],
        "title": event_data.title,
        "description": event_data.description,
        "sport_type": event_data.sport_type,
        "location": event_data.location,
        "latitude": event_data.latitude,
        "longitude": event_data.longitude,
        "date": event_data.date.isoformat(),
        "end_date": event_data.end_date.isoformat() if event_data.end_date else None,
        "max_participants": event_data.max_participants,
        "price": event_data.price,
        "races": races,
        "waves": waves,
        "pricing_tiers": [t.model_dump() for t in event_data.pricing_tiers] if event_data.pricing_tiers else None,
        "custom_fields": custom_fields,
        "options": options,
        "distances": event_data.distances,
        "elevation_gain": event_data.elevation_gain,
        "image_url": event_data.image_url,
        "route_data": event_data.route_data,
        "requires_pps": event_data.requires_pps,
        "requires_medical_cert": event_data.requires_medical_cert,
        "min_age": event_data.min_age,
        "max_age": event_data.max_age,
        "allows_teams": event_data.allows_teams,
        "team_min_size": event_data.team_min_size,
        "team_max_size": event_data.team_max_size,
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

# ============== PROMO CODES ==============

@api_router.post("/promo-codes")
async def create_promo_code(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    data = await request.json()
    
    promo_doc = {
        "promo_id": f"promo_{uuid.uuid4().hex[:8]}",
        "code": data['code'].upper(),
        "discount_type": data.get('discount_type', 'percentage'),
        "discount_value": data['discount_value'],
        "max_uses": data.get('max_uses'),
        "current_uses": 0,
        "valid_from": data.get('valid_from'),
        "valid_until": data.get('valid_until'),
        "event_id": data.get('event_id'),
        "organizer_id": current_user['user_id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.promo_codes.insert_one(promo_doc)
    
    return {"message": "Promo code created", "code": promo_doc['code']}

@api_router.post("/promo-codes/validate")
async def validate_promo_code(request: Request):
    data = await request.json()
    code = data.get('code', '').upper()
    event_id = data.get('event_id')
    
    promo = await db.promo_codes.find_one({
        "code": code,
        "$or": [{"event_id": event_id}, {"event_id": None}]
    }, {"_id": 0})
    
    if not promo:
        raise HTTPException(status_code=404, detail="Code promo invalide")
    
    # Check usage limit
    if promo.get('max_uses') and promo['current_uses'] >= promo['max_uses']:
        raise HTTPException(status_code=400, detail="Code promo épuisé")
    
    # Check validity dates
    now = datetime.now(timezone.utc).isoformat()
    if promo.get('valid_from') and now < promo['valid_from']:
        raise HTTPException(status_code=400, detail="Code promo pas encore valide")
    if promo.get('valid_until') and now > promo['valid_until']:
        raise HTTPException(status_code=400, detail="Code promo expiré")
    
    return {
        "valid": True,
        "discount_type": promo['discount_type'],
        "discount_value": promo['discount_value']
    }

# ============== REGISTRATIONS ROUTES ==============

@api_router.post("/registrations")
async def create_registration(reg_data: RegistrationCreate, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": reg_data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check global capacity
    if event['current_participants'] >= event['max_participants']:
        # Check waitlist option
        raise HTTPException(status_code=400, detail="Event is full")
    
    # Check race capacity if specified
    if reg_data.selected_race and event.get('races'):
        for race in event['races']:
            if race['name'] == reg_data.selected_race:
                if race.get('current_participants', 0) >= race['max_participants']:
                    raise HTTPException(status_code=400, detail=f"Race {reg_data.selected_race} is full")
                break
    
    # Check wave capacity if specified
    if reg_data.selected_wave and event.get('waves'):
        for wave in event['waves']:
            if wave['wave_id'] == reg_data.selected_wave:
                if wave.get('current_participants', 0) >= wave['max_participants']:
                    raise HTTPException(status_code=400, detail="Selected wave is full")
                break
    
    # Check age restriction
    if event.get('min_age') or event.get('max_age'):
        birth_date = current_user.get('birth_date')
        if birth_date:
            age = calculate_age(birth_date)
            if event.get('min_age') and age < event['min_age']:
                raise HTTPException(status_code=400, detail=f"Age minimum: {event['min_age']} ans")
            if event.get('max_age') and age > event['max_age']:
                raise HTTPException(status_code=400, detail=f"Age maximum: {event['max_age']} ans")
    
    # Check PPS requirement
    pps_verified = False
    if event.get('requires_pps'):
        pps_number = reg_data.pps_number or current_user.get('pps_number')
        if not pps_number:
            raise HTTPException(status_code=400, detail="PPS (Pass Prévention Santé) required for this event")
        # In production, verify against FFA database
        pps_verified = True
    
    # Check for existing registration
    existing = await db.registrations.find_one({
        "event_id": reg_data.event_id,
        "user_id": current_user['user_id'],
        "status": "confirmed"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already registered")
    
    registration_id = f"reg_{uuid.uuid4().hex[:12]}"
    bib_number = generate_bib_number(reg_data.event_id, reg_data.selected_race or "")
    
    # Calculate price
    base_price = get_current_price(event)
    
    # Get race-specific price if applicable
    if reg_data.selected_race and event.get('races'):
        for race in event['races']:
            if race['name'] == reg_data.selected_race:
                base_price = race.get('price', base_price)
                break
    
    # Add options price
    options_total = 0
    if reg_data.selected_options and event.get('options'):
        for opt_id in reg_data.selected_options:
            for opt in event['options']:
                if opt['option_id'] == opt_id:
                    options_total += opt['price']
                    break
    
    total_price = base_price + options_total
    
    # Calculate fees (6% platform commission)
    platform_fee = round(total_price * PLATFORM_COMMISSION, 2)
    organizer_amount = round(total_price - platform_fee, 2)
    
    # Generate QR code for check-in
    qr_data = f"SPORTSCONNECT:{registration_id}:{bib_number}"
    qr_code = generate_qr_code(qr_data)
    
    registration_doc = {
        "registration_id": registration_id,
        "event_id": reg_data.event_id,
        "user_id": current_user['user_id'],
        "user_name": current_user['name'],
        "user_email": current_user['email'],
        "bib_number": bib_number,
        "selected_race": reg_data.selected_race,
        "selected_wave": reg_data.selected_wave,
        "selected_options": reg_data.selected_options,
        "emergency_contact": reg_data.emergency_contact,
        "emergency_phone": reg_data.emergency_phone,
        "custom_fields_data": reg_data.custom_fields_data,
        "team_id": reg_data.team_id,
        "payment_status": "pending",
        "payment_id": None,
        "checkout_session_id": None,
        "amount_paid": total_price,
        "platform_fee": platform_fee,
        "organizer_amount": organizer_amount,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "confirmed",
        "pps_number": reg_data.pps_number or current_user.get('pps_number'),
        "pps_verified": pps_verified,
        "medical_cert_url": None,
        "medical_cert_verified": False,
        "qr_code": qr_code,
        "checked_in": False,
        "checked_in_at": None,
        "race_started": False,
        "race_start_time": None,
        "race_finished": False,
        "race_finish_time": None,
        "race_duration_seconds": None
    }
    
    await db.registrations.insert_one(registration_doc)
    
    # Update participant counts
    await db.events.update_one(
        {"event_id": reg_data.event_id},
        {"$inc": {"current_participants": 1}}
    )
    
    # Update race count if applicable
    if reg_data.selected_race and event.get('races'):
        await db.events.update_one(
            {"event_id": reg_data.event_id, "races.name": reg_data.selected_race},
            {"$inc": {"races.$.current_participants": 1}}
        )
    
    # Update wave count if applicable
    if reg_data.selected_wave and event.get('waves'):
        await db.events.update_one(
            {"event_id": reg_data.event_id, "waves.wave_id": reg_data.selected_wave},
            {"$inc": {"waves.$.current_participants": 1}}
        )
    
    return {
        "registration_id": registration_id,
        "bib_number": bib_number,
        "amount": total_price,
        "event_title": event['title'],
        "qr_code": qr_code
    }

@api_router.get("/registrations")
async def get_user_registrations(current_user: dict = Depends(get_current_user)):
    registrations = await db.registrations.find(
        {"user_id": current_user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
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

@api_router.get("/registrations/{registration_id}/ticket")
async def get_digital_ticket(registration_id: str, current_user: dict = Depends(get_current_user)):
    """Get digital ticket with QR code"""
    registration = await db.registrations.find_one(
        {"registration_id": registration_id},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration['user_id'] != current_user['user_id'] and current_user['role'] not in ['admin', 'organizer']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    event = await db.events.find_one({"event_id": registration['event_id']}, {"_id": 0})
    
    return {
        "ticket": {
            "registration_id": registration_id,
            "bib_number": registration['bib_number'],
            "participant_name": registration['user_name'],
            "event_title": event['title'] if event else "N/A",
            "event_date": event['date'] if event else None,
            "event_location": event['location'] if event else None,
            "selected_race": registration.get('selected_race'),
            "selected_wave": registration.get('selected_wave'),
            "qr_code": registration.get('qr_code'),
            "payment_status": registration['payment_status']
        }
    }

@api_router.post("/registrations/{registration_id}/transfer")
async def transfer_bib(registration_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Transfer bib to another participant"""
    data = await request.json()
    new_user_email = data.get('email')
    
    if not new_user_email:
        raise HTTPException(status_code=400, detail="Email du nouveau participant requis")
    
    registration = await db.registrations.find_one(
        {"registration_id": registration_id},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration['user_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find new user
    new_user = await db.users.find_one({"email": new_user_email}, {"_id": 0})
    if not new_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Check if new user is already registered
    existing = await db.registrations.find_one({
        "event_id": registration['event_id'],
        "user_id": new_user['user_id'],
        "status": "confirmed"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Ce participant est déjà inscrit")
    
    # Generate new QR code
    qr_data = f"SPORTSCONNECT:{registration_id}:{registration['bib_number']}"
    qr_code = generate_qr_code(qr_data)
    
    # Transfer registration
    await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {
            "user_id": new_user['user_id'],
            "user_name": new_user['name'],
            "user_email": new_user['email'],
            "qr_code": qr_code,
            "transferred_from": current_user['user_id'],
            "transferred_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Dossard transféré avec succès", "new_participant": new_user['name']}

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

# ============== WAITLIST ==============

@api_router.post("/waitlist")
async def join_waitlist(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    event_id = data.get('event_id')
    selected_race = data.get('selected_race')
    
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if already on waitlist
    existing = await db.waitlist.find_one({
        "event_id": event_id,
        "user_id": current_user['user_id']
    })
    if existing:
        raise HTTPException(status_code=400, detail="Déjà sur la liste d'attente")
    
    # Get position
    count = await db.waitlist.count_documents({"event_id": event_id})
    
    waitlist_doc = {
        "waitlist_id": f"wl_{uuid.uuid4().hex[:12]}",
        "event_id": event_id,
        "user_id": current_user['user_id'],
        "user_name": current_user['name'],
        "user_email": current_user['email'],
        "selected_race": selected_race,
        "position": count + 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "notified": False
    }
    
    await db.waitlist.insert_one(waitlist_doc)
    
    return {"message": "Ajouté à la liste d'attente", "position": count + 1}

@api_router.get("/waitlist/{event_id}")
async def get_waitlist_position(event_id: str, current_user: dict = Depends(get_current_user)):
    entry = await db.waitlist.find_one({
        "event_id": event_id,
        "user_id": current_user['user_id']
    }, {"_id": 0})
    
    if not entry:
        return {"on_waitlist": False}
    
    return {
        "on_waitlist": True,
        "position": entry['position'],
        "created_at": entry['created_at']
    }

# ============== TEAMS ==============

@api_router.post("/teams")
async def create_team(team_data: TeamCreate, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": team_data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if not event.get('allows_teams'):
        raise HTTPException(status_code=400, detail="Teams not allowed for this event")
    
    team_id = f"team_{uuid.uuid4().hex[:12]}"
    
    team_doc = {
        "team_id": team_id,
        "event_id": team_data.event_id,
        "team_name": team_data.team_name,
        "captain_user_id": current_user['user_id'],
        "selected_race": team_data.selected_race,
        "members": [{
            "user_id": current_user['user_id'],
            "name": current_user['name'],
            "email": current_user['email'],
            "role": "captain"
        }],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "forming"
    }
    
    await db.teams.insert_one(team_doc)
    
    return {"team_id": team_id, "team_name": team_data.team_name}

@api_router.post("/teams/{team_id}/join")
async def join_team(team_id: str, current_user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"team_id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    event = await db.events.find_one({"event_id": team['event_id']}, {"_id": 0})
    
    # Check team size limit
    if event.get('team_max_size') and len(team['members']) >= event['team_max_size']:
        raise HTTPException(status_code=400, detail="Team is full")
    
    # Check if already member
    for member in team['members']:
        if member['user_id'] == current_user['user_id']:
            raise HTTPException(status_code=400, detail="Already a team member")
    
    await db.teams.update_one(
        {"team_id": team_id},
        {"$push": {"members": {
            "user_id": current_user['user_id'],
            "name": current_user['name'],
            "email": current_user['email'],
            "role": "member"
        }}}
    )
    
    return {"message": "Joined team successfully"}

@api_router.get("/teams/{team_id}")
async def get_team(team_id: str):
    team = await db.teams.find_one({"team_id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

# ============== CHECK-IN ==============

@api_router.post("/checkin/scan")
async def scan_checkin(request: Request, current_user: dict = Depends(get_current_user)):
    """Scan QR code for check-in (organizer only)"""
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    data = await request.json()
    qr_data = data.get('qr_data', '')
    
    # Parse QR data: SPORTSCONNECT:registration_id:bib_number
    parts = qr_data.split(':')
    if len(parts) != 3 or parts[0] != 'SPORTSCONNECT':
        raise HTTPException(status_code=400, detail="Invalid QR code")
    
    registration_id = parts[1]
    
    registration = await db.registrations.find_one(
        {"registration_id": registration_id},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration['checked_in']:
        return {
            "success": False,
            "message": f"Déjà enregistré à {registration['checked_in_at']}",
            "registration": registration
        }
    
    await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {
            "checked_in": True,
            "checked_in_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Check-in réussi",
        "bib_number": registration['bib_number'],
        "participant_name": registration['user_name'],
        "selected_race": registration.get('selected_race')
    }

@api_router.get("/checkin/stats/{event_id}")
async def get_checkin_stats(event_id: str, current_user: dict = Depends(get_current_user)):
    """Get real-time check-in statistics"""
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    total = await db.registrations.count_documents({"event_id": event_id, "status": "confirmed"})
    checked_in = await db.registrations.count_documents({"event_id": event_id, "checked_in": True})
    
    return {
        "total_registrations": total,
        "checked_in": checked_in,
        "pending": total - checked_in,
        "percentage": round((checked_in / total * 100) if total > 0 else 0, 1)
    }

# ============== TIMING / CHRONOMETER ==============

@api_router.post("/timing/start")
async def start_race_timer(request: Request, current_user: dict = Depends(get_current_user)):
    """Participant starts their own timer"""
    data = await request.json()
    registration_id = data.get('registration_id')
    
    registration = await db.registrations.find_one(
        {"registration_id": registration_id, "user_id": current_user['user_id']},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration.get('race_started'):
        raise HTTPException(status_code=400, detail="Race already started")
    
    start_time = datetime.now(timezone.utc).isoformat()
    
    await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {
            "race_started": True,
            "race_start_time": start_time
        }}
    )
    
    return {"message": "Timer started", "start_time": start_time}

@api_router.post("/timing/stop")
async def stop_race_timer(request: Request, current_user: dict = Depends(get_current_user)):
    """Participant stops their timer"""
    data = await request.json()
    registration_id = data.get('registration_id')
    
    registration = await db.registrations.find_one(
        {"registration_id": registration_id, "user_id": current_user['user_id']},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if not registration.get('race_started'):
        raise HTTPException(status_code=400, detail="Race not started")
    
    if registration.get('race_finished'):
        raise HTTPException(status_code=400, detail="Race already finished")
    
    finish_time = datetime.now(timezone.utc)
    start_time = datetime.fromisoformat(registration['race_start_time'].replace('Z', '+00:00'))
    duration = (finish_time - start_time).total_seconds()
    
    await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {
            "race_finished": True,
            "race_finish_time": finish_time.isoformat(),
            "race_duration_seconds": int(duration)
        }}
    )
    
    # Format duration
    hours = int(duration // 3600)
    minutes = int((duration % 3600) // 60)
    seconds = int(duration % 60)
    formatted_time = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    
    return {
        "message": "Timer stopped",
        "finish_time": finish_time.isoformat(),
        "duration_seconds": int(duration),
        "formatted_time": formatted_time
    }

@api_router.get("/timing/results/{event_id}")
async def get_race_results(event_id: str, race: Optional[str] = None):
    """Get race results (public)"""
    query = {
        "event_id": event_id,
        "race_finished": True,
        "race_duration_seconds": {"$ne": None}
    }
    
    if race:
        query["selected_race"] = race
    
    results = await db.registrations.find(
        query,
        {"_id": 0, "user_name": 1, "bib_number": 1, "selected_race": 1, 
         "race_duration_seconds": 1, "race_start_time": 1, "race_finish_time": 1}
    ).sort("race_duration_seconds", 1).to_list(1000)
    
    # Add rank and format time
    for idx, result in enumerate(results):
        result['rank'] = idx + 1
        duration = result['race_duration_seconds']
        hours = int(duration // 3600)
        minutes = int((duration % 3600) // 60)
        seconds = int(duration % 60)
        result['formatted_time'] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    
    return {"results": results, "total": len(results)}

@api_router.get("/timing/my-results")
async def get_my_results(current_user: dict = Depends(get_current_user)):
    """Get participant's own results across all events"""
    results = await db.registrations.find(
        {
            "user_id": current_user['user_id'],
            "race_finished": True,
            "race_duration_seconds": {"$ne": None}
        },
        {"_id": 0}
    ).sort("race_finish_time", -1).to_list(100)
    
    for result in results:
        event = await db.events.find_one({"event_id": result['event_id']}, {"_id": 0, "title": 1, "date": 1})
        result['event'] = event
        
        # Format time
        duration = result['race_duration_seconds']
        hours = int(duration // 3600)
        minutes = int((duration % 3600) // 60)
        seconds = int(duration % 60)
        result['formatted_time'] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    
    return {"results": results}

# ============== PAYMENT ROUTES (STRIPE) ==============

@api_router.post("/payments/create-checkout")
async def create_checkout_session(request: Request, current_user: dict = Depends(get_current_user)):
    """Create Stripe checkout session"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    data = await request.json()
    registration_id = data.get('registration_id')
    origin_url = data.get('origin_url')
    promo_code = data.get('promo_code')
    
    registration = await db.registrations.find_one(
        {"registration_id": registration_id, "user_id": current_user['user_id']},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration['payment_status'] == 'completed':
        raise HTTPException(status_code=400, detail="Already paid")
    
    # Get amount
    amount = registration['amount_paid']
    
    # Apply promo code if provided
    if promo_code:
        promo = await db.promo_codes.find_one({"code": promo_code.upper()}, {"_id": 0})
        if promo:
            if promo['discount_type'] == 'percentage':
                amount = amount * (1 - promo['discount_value'] / 100)
            else:
                amount = max(0, amount - promo['discount_value'])
            
            # Increment promo usage
            await db.promo_codes.update_one(
                {"code": promo_code.upper()},
                {"$inc": {"current_uses": 1}}
            )
    
    # Recalculate fees
    platform_fee = round(amount * PLATFORM_COMMISSION, 2)
    organizer_amount = round(amount - platform_fee, 2)
    
    # Build URLs
    success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/payment/cancel"
    
    # Initialize Stripe
    api_key = STRIPE_API_KEY or os.environ.get('STRIPE_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Payment not configured")
    
    webhook_url = f"{request.base_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=float(amount),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "registration_id": registration_id,
            "user_id": current_user['user_id'],
            "event_id": registration['event_id']
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Store session info
    await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {
            "checkout_session_id": session.session_id,
            "amount_paid": amount,
            "platform_fee": platform_fee,
            "organizer_amount": organizer_amount
        }}
    )
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "registration_id": registration_id,
        "user_id": current_user['user_id'],
        "amount": amount,
        "currency": "eur",
        "platform_fee": platform_fee,
        "organizer_amount": organizer_amount,
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """Check payment status"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = STRIPE_API_KEY or os.environ.get('STRIPE_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Payment not configured")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update registration if paid
        if status.payment_status == 'paid':
            await db.registrations.update_one(
                {"checkout_session_id": session_id},
                {"$set": {"payment_status": "completed"}}
            )
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "completed"}}
            )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100,
            "currency": status.currency
        }
    except Exception as e:
        logger.error(f"Payment status error: {e}")
        raise HTTPException(status_code=500, detail="Error checking payment status")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = STRIPE_API_KEY or os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
        
        if event.payment_status == 'paid':
            await db.registrations.update_one(
                {"checkout_session_id": event.session_id},
                {"$set": {"payment_status": "completed", "payment_id": event.event_id}}
            )
            
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {"payment_status": "completed"}}
            )
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": False, "error": str(e)}

@api_router.post("/payments/refund")
async def request_refund(request: Request, current_user: dict = Depends(get_current_user)):
    """Request refund for a registration"""
    data = await request.json()
    registration_id = data.get('registration_id')
    reason = data.get('reason', '')
    
    registration = await db.registrations.find_one(
        {"registration_id": registration_id},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration['user_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if registration['payment_status'] != 'completed':
        raise HTTPException(status_code=400, detail="Payment not completed")
    
    # Create refund request
    refund_id = f"ref_{uuid.uuid4().hex[:12]}"
    
    await db.refund_requests.insert_one({
        "refund_id": refund_id,
        "registration_id": registration_id,
        "user_id": registration['user_id'],
        "amount": registration['amount_paid'],
        "reason": reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Demande de remboursement créée", "refund_id": refund_id}

# ============== AI CHATBOT ROUTES ==============

@api_router.post("/chat")
async def chat_with_ai(chat_request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """AI Chatbot using OpenAI GPT-5.2"""
    
    if not EMERGENT_LLM_KEY:
        return {"response": "AI service not configured. Please contact support."}
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        session_id = chat_request.session_id or f"chat_{current_user['user_id']}_{uuid.uuid4().hex[:8]}"
        
        events = await db.events.find({"status": "active"}, {"_id": 0}).limit(10).to_list(10)
        events_context = "\n".join([f"- {e['title']} ({e['sport_type']}) - {e['location']} - {e['date'][:10]} - {e.get('price', 0)}€" for e in events])
        
        system_message = f"""Tu es Coach AI, l'assistant virtuel de SportsConnect, une plateforme de réservation d'événements sportifs.

Tu aides les participants à:
- Trouver des événements adaptés à leur niveau et préférences
- Comprendre les parcours, distances et dénivelés
- Répondre aux questions sur les inscriptions, PPS, et paiements
- Donner des conseils d'entraînement personnalisés
- Expliquer le Pass Prévention Santé (PPS) obligatoire pour les courses

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
    """AI-powered event recommendations"""
    
    registrations = await db.registrations.find(
        {"user_id": current_user['user_id']},
        {"_id": 0}
    ).to_list(50)
    
    sport_preferences = {}
    for reg in registrations:
        event = await db.events.find_one({"event_id": reg['event_id']}, {"_id": 0})
        if event:
            sport_type = event.get('sport_type', 'running')
            sport_preferences[sport_type] = sport_preferences.get(sport_type, 0) + 1
    
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
    
    payments = await db.payment_transactions.find({"payment_status": "completed"}, {"_id": 0}).to_list(10000)
    total_revenue = sum(p.get('amount', 0) for p in payments)
    platform_fees = sum(p.get('platform_fee', 0) for p in payments)
    
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
    total = await db.payment_transactions.count_documents({})
    payments = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "payments": payments,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/admin/refunds")
async def get_refund_requests(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    refunds = await db.refund_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"refunds": refunds}

@api_router.put("/admin/refunds/{refund_id}")
async def process_refund(refund_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    data = await request.json()
    status = data.get('status')  # approved, rejected
    
    await db.refund_requests.update_one(
        {"refund_id": refund_id},
        {"$set": {
            "status": status,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "processed_by": current_user['user_id']
        }}
    )
    
    if status == 'approved':
        refund = await db.refund_requests.find_one({"refund_id": refund_id}, {"_id": 0})
        await db.registrations.update_one(
            {"registration_id": refund['registration_id']},
            {"$set": {"payment_status": "refunded", "status": "cancelled"}}
        )
    
    return {"message": f"Refund {status}"}

# ============== CATEGORIES ==============

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
    return {"message": "SportsConnect API", "status": "running", "version": "2.0"}

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
