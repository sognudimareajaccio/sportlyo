from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="SportLyo API")

# Import and include all routers
from routers.auth import router as auth_router
from routers.events import router as events_router
from routers.registrations import router as registrations_router
from routers.organizer import router as organizer_router
from routers.shop import router as shop_router
from routers.messaging import router as messaging_router
from routers.timing import router as timing_router
from routers.payments import router as payments_router
from routers.admin import router as admin_router
from routers.chat import router as chat_router
from routers.uploads import router as uploads_router
from routers.provider import router as provider_router
from routers.participant import router as participant_router
from routers.notifications import router as notifications_router

app.include_router(auth_router)
app.include_router(events_router)
app.include_router(registrations_router)
app.include_router(organizer_router)
app.include_router(shop_router)
app.include_router(messaging_router)
app.include_router(timing_router)
app.include_router(payments_router)
app.include_router(admin_router)
app.include_router(chat_router)
app.include_router(uploads_router)
app.include_router(provider_router)
app.include_router(participant_router)
app.include_router(notifications_router)


# ============== HEALTH CHECK ==============

@app.get("/api/")
async def root():
    return {"message": "SportLyo API", "status": "running", "version": "3.0"}


@app.get("/api/health")
async def health_check():
    from datetime import datetime, timezone
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def seed_default_accounts():
    from deps import db, hash_password
    from datetime import datetime, timezone
    defaults = [
        {"user_id": "user_admin_001", "email": "admin@sportsconnect.fr", "name": "Admin SportLyo", "password": "admin123", "role": "admin", "status": "active", "company_name": ""},
        {"user_id": "user_org_001", "email": "club@paris-sport.fr", "name": "Club Sportif Paris", "password": "club123", "role": "organizer", "status": "active", "company_name": "Club Sportif Paris"},
        {"user_id": "user_part_001", "email": "pierre@test.com", "name": "Pierre Dupont", "password": "test1234", "role": "participant", "status": "active", "company_name": ""},
        {"user_id": "user_provider_001", "email": "boutique@sportlyo.fr", "name": "SportWear Lyon", "password": "boutique123", "role": "provider", "status": "active", "company_name": "SportWear Lyon"},
    ]
    for d in defaults:
        existing = await db.users.find_one({"email": d["email"]})
        if not existing:
            await db.users.insert_one({
                **{k: v for k, v in d.items() if k != "password"},
                "password": hash_password(d["password"]),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "phone": None, "iban": None, "picture": None,
                "birth_date": None, "gender": None,
                "pps_number": None, "pps_valid_until": None
            })
            logger.info(f"Seed: created {d['role']} account {d['email']}")


@app.on_event("shutdown")
async def shutdown_db_client():
    from deps import client
    client.close()
