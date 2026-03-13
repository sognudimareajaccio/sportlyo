from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import HTTPException, Request
from typing import Optional
import os
import jwt
import bcrypt
import uuid
import random
import string
import base64
import qrcode
from io import BytesIO
from datetime import datetime, timezone, timedelta
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT
JWT_SECRET = os.environ.get('JWT_SECRET', 'sportsconnect-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7

# Platform Commission
PLATFORM_COMMISSION = 0.05
STRIPE_PERCENT_FEE = 0.014
STRIPE_FIXED_FEE = 0.25

# Square
SQUARE_ACCESS_TOKEN = os.environ.get('SQUARE_ACCESS_TOKEN', '')
SQUARE_LOCATION_ID = os.environ.get('SQUARE_LOCATION_ID', '')
SQUARE_ENVIRONMENT = os.environ.get('SQUARE_ENVIRONMENT', 'sandbox')

# Keys
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
ADMIN_NOTIFICATION_EMAIL = os.environ.get("ADMIN_NOTIFICATION_EMAIL", "contact.sognudimare@gmail.com")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


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


def generate_rfid_chip_id() -> str:
    return f"{random.randint(1000000000, 9999999999)}"


def calculate_category(birth_date_str: str, gender: str = "M") -> str:
    if not birth_date_str:
        return "SEN"
    try:
        birth = datetime.fromisoformat(birth_date_str)
        age = (datetime.now(timezone.utc) - birth.replace(tzinfo=timezone.utc)).days // 365
        prefix = "M" if gender == "M" else "F"
        if age < 18: return f"{prefix}-JUN"
        elif age < 23: return f"{prefix}-ESP"
        elif age < 40: return f"{prefix}-SEN"
        elif age < 50: return f"{prefix}-M1"
        elif age < 60: return f"{prefix}-M2"
        elif age < 70: return f"{prefix}-M3"
        else: return f"{prefix}-M4"
    except:
        return "SEN"


def format_duration(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def generate_qr_code(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()


def calculate_age(birth_date: str) -> int:
    try:
        birth = datetime.strptime(birth_date, "%Y-%m-%d")
        today = datetime.now()
        return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
    except:
        return 0


def get_current_price(event: dict) -> float:
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
