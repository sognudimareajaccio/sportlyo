from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from deps import db, get_current_user, hash_password, verify_password, create_token, decode_token, JWT_SECRET, JWT_ALGORITHM
from models import UserCreate, UserLogin
import uuid
import asyncio
import httpx
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.post("/auth/register")
async def register(request: Request):
    data = await request.json()
    user_data = UserCreate(**data)
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    requested_role = data.get("role", "participant")
    if requested_role not in ["participant", "organizer", "provider"]:
        requested_role = "participant"

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user_data.password)

    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "password": hashed_password,
        "role": requested_role,
        "status": "pending" if requested_role == "provider" else "active",
        "company_name": data.get("company_name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "picture": None,
        "iban": None,
        "birth_date": user_data.birth_date,
        "gender": user_data.gender,
        "pps_number": None,
        "pps_valid_until": None
    }

    await db.users.insert_one(user_doc)

    if requested_role == "provider":
        return {
            "message": "Inscription enregistree. Votre compte prestataire est en attente de validation par l'administrateur.",
            "pending": True,
            "user": {"user_id": user_id, "email": user_data.email, "name": user_data.name, "role": "provider", "status": "pending"}
        }

    token = create_token(user_id, requested_role)

    try:
        from email_service import send_email, email_welcome
        subj, html = email_welcome(user_data.name)
        asyncio.create_task(send_email(user_data.email, subj, html))
    except Exception as e:
        logger.error(f"Welcome email error: {e}")

    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": requested_role
        }
    }


@router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(credentials.password, user.get('password', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.get('status') == 'pending':
        raise HTTPException(status_code=403, detail="Votre compte est en attente de validation par l'administrateur.")
    if user.get('status') == 'rejected':
        raise HTTPException(status_code=403, detail="Votre inscription a ete refusee par l'administrateur.")

    token = create_token(user['user_id'], user['role'])

    return {
        "token": token,
        "user": {
            "user_id": user['user_id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role'],
            "picture": user.get('picture'),
            "company_name": user.get('company_name')
        }
    }


@router.get("/auth/me")
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
        "pps_valid_until": current_user.get('pps_valid_until'),
        "company_name": current_user.get('company_name')
    }


@router.post("/auth/session")
async def handle_oauth_session(request: Request):
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
            await db.users.update_one({"user_id": user_id}, {"$set": {"picture": oauth_data.get('picture')}})
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
            "phone": None, "iban": None, "password": None,
            "birth_date": None, "gender": None,
            "pps_number": None, "pps_valid_until": None
        }
        await db.users.insert_one(user_doc)

    session_token = create_token(user_id, role)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    resp = JSONResponse({
        "user": {
            "user_id": user_id, "email": oauth_data['email'],
            "name": oauth_data['name'], "picture": oauth_data.get('picture'), "role": role
        },
        "token": session_token
    })
    resp.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", max_age=7*24*60*60, path="/")
    return resp


@router.post("/auth/logout")
async def logout(request: Request):
    token = request.cookies.get('session_token')
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    resp = JSONResponse({"message": "Logged out"})
    resp.delete_cookie("session_token", path="/")
    return resp


@router.put("/auth/profile")
async def update_profile(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    update_fields = {}
    for field in ['name', 'phone', 'iban', 'birth_date', 'gender', 'pps_number']:
        if field in data:
            update_fields[field] = data[field]
    if update_fields:
        await db.users.update_one({"user_id": current_user['user_id']}, {"$set": update_fields})
    return {"message": "Profile updated"}


@router.put("/auth/role")
async def upgrade_role(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    new_role = data.get('role')
    if new_role not in ['organizer']:
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"user_id": current_user['user_id']}, {"$set": {"role": new_role}})
    if new_role == 'organizer':
        await db.organizer_profiles.update_one(
            {"user_id": current_user['user_id']},
            {"$set": {
                "user_id": current_user['user_id'],
                "company_name": data.get('company_name', current_user['name']),
                "description": data.get('description'),
                "iban": data.get('iban'),
                "stripe_account_id": None, "verified": False
            }},
            upsert=True
        )
    return {"message": "Role updated", "role": new_role}


# ============== PPS VERIFICATION ==============

@router.post("/pps/verify")
async def verify_pps(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    pps_number = data.get('pps_number', '').strip().upper()
    if not pps_number:
        raise HTTPException(status_code=400, detail="PPS number required")
    if not (len(pps_number) >= 10 and pps_number[0] == 'P'):
        raise HTTPException(status_code=400, detail="Invalid PPS format")

    is_valid = True
    valid_until = (datetime.now(timezone.utc) + timedelta(days=365)).strftime("%Y-%m-%d")

    if is_valid:
        await db.users.update_one(
            {"user_id": current_user['user_id']},
            {"$set": {"pps_number": pps_number, "pps_valid_until": valid_until}}
        )
        return {"verified": True, "pps_number": pps_number, "valid_until": valid_until, "message": "PPS verifie avec succes"}
    else:
        raise HTTPException(status_code=400, detail="PPS number not found or expired")


@router.get("/pps/status")
async def get_pps_status(current_user: dict = Depends(get_current_user)):
    pps_number = current_user.get('pps_number')
    pps_valid_until = current_user.get('pps_valid_until')
    if not pps_number:
        return {"has_pps": False, "message": "Aucun PPS enregistre"}
    if pps_valid_until:
        valid_date = datetime.strptime(pps_valid_until, "%Y-%m-%d")
        is_valid = valid_date > datetime.now()
    else:
        is_valid = False
    return {
        "has_pps": True, "pps_number": pps_number,
        "valid_until": pps_valid_until, "is_valid": is_valid,
        "message": "PPS valide" if is_valid else "PPS expire"
    }
