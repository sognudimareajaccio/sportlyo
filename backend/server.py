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

    # Seed events
    seed_events = [
        {
            "event_id": "evt_seed_marathon_lyon",
            "organizer_id": "user_org_001", "organizer_name": "Club Sportif Paris",
            "title": "Marathon de Lyon 2026",
            "description": "Le marathon incontournable de Lyon ! Parcourez les rues de la capitale des Gaules sur un parcours plat et rapide, traversant les quartiers historiques de la Presqu'ile, le Parc de la Tete d'Or et les berges du Rhone. Ambiance garantie avec des milliers de spectateurs tout au long du parcours.",
            "sport_type": "running", "location": "Lyon, Rhone", "latitude": 45.7578, "longitude": 4.8320,
            "date": "2026-05-17T08:00:00", "end_date": "2026-05-17T18:00:00",
            "max_participants": 5000, "price": 55,
            "races": [
                {"race_id": "race_marathon", "name": "Marathon 42km", "distance": "42.195km", "price": 55, "max_participants": 3000, "current_participants": 0, "elevation_gain": "120m"},
                {"race_id": "race_semi", "name": "Semi-Marathon 21km", "distance": "21.1km", "price": 35, "max_participants": 2000, "current_participants": 0, "elevation_gain": "60m"},
                {"race_id": "race_10k", "name": "10km Decouverte", "distance": "10km", "price": 20, "max_participants": 3000, "current_participants": 0, "elevation_gain": "30m"}
            ],
            "distances": ["42.195km", "21.1km", "10km"], "elevation_gain": "120m",
            "image_url": "https://images.unsplash.com/photo-1665810349262-5f613669bb64?w=1200",
            "requires_pps": True, "requires_medical_cert": True,
            "themes": ["marathon", "route", "urbain"], "circuit_type": "boucle",
            "has_timer": True, "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(), "current_participants": 0
        },
        {
            "event_id": "evt_seed_trail_alpes",
            "organizer_id": "user_org_001", "organizer_name": "Club Sportif Paris",
            "title": "Trail des Alpes - Ultra Montagne",
            "description": "Defiez les sommets alpins sur ce trail exigeant ! Trois distances pour tous les niveaux, des sentiers techniques en altitude, des passages en crete avec vue sur le Mont Blanc. Ravitaillements gourmands avec produits locaux. Un defi sportif inoubliable dans un cadre naturel exceptionnel.",
            "sport_type": "trail", "location": "Chamonix, Haute-Savoie", "latitude": 45.9237, "longitude": 6.8694,
            "date": "2026-07-12T06:00:00", "end_date": "2026-07-13T20:00:00",
            "max_participants": 1500, "price": 75,
            "races": [
                {"race_id": "race_ultra", "name": "Ultra Trail 80km", "distance": "80km", "price": 95, "max_participants": 300, "current_participants": 0, "elevation_gain": "5200m"},
                {"race_id": "race_trail45", "name": "Trail 45km", "distance": "45km", "price": 65, "max_participants": 500, "current_participants": 0, "elevation_gain": "2800m"},
                {"race_id": "race_trail20", "name": "Rando Trail 20km", "distance": "20km", "price": 40, "max_participants": 700, "current_participants": 0, "elevation_gain": "1200m"}
            ],
            "distances": ["80km", "45km", "20km"], "elevation_gain": "5200m",
            "image_url": "https://images.unsplash.com/photo-1631901977676-628e9893a068?w=1200",
            "requires_pps": True, "requires_medical_cert": True,
            "themes": ["trail", "montagne", "ultra"], "circuit_type": "boucle",
            "has_timer": True, "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(), "current_participants": 0
        },
        {
            "event_id": "evt_seed_cyclo_beaujolais",
            "organizer_id": "user_org_001", "organizer_name": "Club Sportif Paris",
            "title": "Cyclosportive du Beaujolais",
            "description": "Pedalez a travers les vignobles du Beaujolais sur des routes panoramiques ! Trois parcours au choix avec ravitaillements gastronomiques (fromages, charcuteries et un verre de Beaujolais a l'arrivee). Parcours valloné, chrono officiel et classement par categories.",
            "sport_type": "cycling", "location": "Villefranche-sur-Saone, Rhone", "latitude": 45.9833, "longitude": 4.7167,
            "date": "2026-06-21T07:30:00", "end_date": "2026-06-21T17:00:00",
            "max_participants": 2000, "price": 45,
            "races": [
                {"race_id": "race_cyclo_grand", "name": "Grand Parcours 120km", "distance": "120km", "price": 50, "max_participants": 600, "current_participants": 0, "elevation_gain": "2100m"},
                {"race_id": "race_cyclo_moyen", "name": "Parcours Moyen 80km", "distance": "80km", "price": 40, "max_participants": 800, "current_participants": 0, "elevation_gain": "1400m"},
                {"race_id": "race_cyclo_decouverte", "name": "Decouverte 40km", "distance": "40km", "price": 30, "max_participants": 600, "current_participants": 0, "elevation_gain": "600m"}
            ],
            "distances": ["120km", "80km", "40km"], "elevation_gain": "2100m",
            "image_url": "https://images.unsplash.com/photo-1753516231269-2a676b28f6fc?w=1200",
            "requires_pps": False, "requires_medical_cert": True,
            "themes": ["velo", "route", "gastronomie"], "circuit_type": "boucle",
            "has_timer": True, "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(), "current_participants": 0
        },
        {
            "event_id": "evt_seed_triathlon_annecy",
            "organizer_id": "user_org_001", "organizer_name": "Club Sportif Paris",
            "title": "Triathlon du Lac d'Annecy",
            "description": "Le plus beau triathlon de France ! Nagez dans les eaux cristallines du lac d'Annecy, roulez sur les routes panoramiques de Haute-Savoie et courez le long des berges. Format olympique et sprint disponibles. Un cadre exceptionnel pour une epreuve sportive de haut niveau.",
            "sport_type": "triathlon", "location": "Annecy, Haute-Savoie", "latitude": 45.8992, "longitude": 6.1294,
            "date": "2026-08-30T08:00:00", "end_date": "2026-08-30T16:00:00",
            "max_participants": 1200, "price": 65,
            "races": [
                {"race_id": "race_tri_olympique", "name": "Distance Olympique", "distance": "51.5km (1.5/40/10)", "price": 70, "max_participants": 600, "current_participants": 0, "elevation_gain": "350m"},
                {"race_id": "race_tri_sprint", "name": "Sprint", "distance": "25.75km (0.75/20/5)", "price": 50, "max_participants": 600, "current_participants": 0, "elevation_gain": "150m"}
            ],
            "distances": ["51.5km", "25.75km"], "elevation_gain": "350m",
            "image_url": "https://images.unsplash.com/photo-1758633919862-4fa8282540a3?w=1200",
            "requires_pps": True, "requires_medical_cert": True,
            "themes": ["triathlon", "natation", "multisport"], "circuit_type": "point-a-point",
            "has_timer": True, "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(), "current_participants": 0
        }
    ]
    for evt in seed_events:
        existing = await db.events.find_one({"event_id": evt["event_id"]})
        if not existing:
            await db.events.insert_one(evt)
            logger.info(f"Seed: created event {evt['title']}")

    # Seed provider catalog products
    seed_provider_products = [
        {"product_id": "pprod_seed_tshirt", "provider_id": "user_provider_001", "name": "T-shirt Finisher", "description": "T-shirt technique respirant 100% polyester recycle. Coupe ajustee, impression sublimation aux couleurs de l'evenement.", "category": "Textile", "price": 35, "sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["Noir", "Blanc", "Orange"], "stock": 200, "sold": 0, "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600", "suggested_commission": 5},
        {"product_id": "pprod_seed_sweat", "provider_id": "user_provider_001", "name": "Sweat a capuche", "description": "Sweat en coton bio 320g, broderie logo evenement sur le coeur. Capuche doublee, poche kangourou. Parfait pour l'apres-course.", "category": "Textile", "price": 55, "sizes": ["S", "M", "L", "XL"], "colors": ["Gris chine", "Noir"], "stock": 100, "sold": 0, "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600", "suggested_commission": 5},
        {"product_id": "pprod_seed_casquette", "provider_id": "user_provider_001", "name": "Casquette Running", "description": "Casquette legere avec protection UV, bandeau anti-transpiration integre. Logo evenement brode.", "category": "Accessoire", "price": 22, "sizes": ["Unique"], "colors": ["Noir", "Blanc"], "stock": 150, "sold": 0, "image_url": "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=600", "suggested_commission": 3},
        {"product_id": "pprod_seed_gourde", "provider_id": "user_provider_001", "name": "Gourde isotherme 750ml", "description": "Gourde en inox double paroi, garde froid 24h / chaud 12h. Gravure laser du logo evenement.", "category": "Gourde", "price": 28, "sizes": ["Unique"], "colors": ["Argent", "Noir", "Bleu"], "stock": 120, "sold": 0, "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600", "suggested_commission": 4},
        {"product_id": "pprod_seed_bandeau", "provider_id": "user_provider_001", "name": "Bandeau sport", "description": "Bandeau elastique anti-transpiration, seche rapidement. Logo silicone. Taille unique ajustable.", "category": "Accessoire", "price": 12, "sizes": ["Unique"], "colors": ["Noir", "Orange", "Bleu"], "stock": 200, "sold": 0, "image_url": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600", "suggested_commission": 2},
        {"product_id": "pprod_seed_sac", "provider_id": "user_provider_001", "name": "Sac a dos Trail 15L", "description": "Sac a dos trail ultra-leger avec poche a eau 1.5L, poches avant pour flasques, filet de compression. Logo evenement.", "category": "Sac", "price": 65, "sizes": ["S/M", "L/XL"], "colors": ["Noir/Orange", "Gris/Bleu"], "stock": 80, "sold": 0, "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600", "suggested_commission": 7},
        {"product_id": "pprod_seed_chaussettes", "provider_id": "user_provider_001", "name": "Chaussettes compression", "description": "Chaussettes de compression haute performance, renfort talon et pointe, anti-ampoules. Pack de 2 paires.", "category": "Textile", "price": 18, "sizes": ["36-39", "40-43", "44-47"], "colors": ["Noir", "Blanc"], "stock": 300, "sold": 0, "image_url": "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600", "suggested_commission": 2},
        {"product_id": "pprod_seed_medaille", "provider_id": "user_provider_001", "name": "Medaille Finisher personnalisee", "description": "Medaille en metal emaillee avec ruban personnalise aux couleurs de l'evenement. Gravure nom et temps au dos.", "category": "Accessoire", "price": 15, "sizes": ["Unique"], "colors": [], "stock": 500, "sold": 0, "image_url": "https://images.unsplash.com/photo-1567427361984-0cbe7396fc6c?w=600", "suggested_commission": 3}
    ]
    for pp in seed_provider_products:
        existing = await db.provider_products.find_one({"product_id": pp["product_id"]})
        if not existing:
            await db.provider_products.insert_one(pp)
            logger.info(f"Seed: created provider product {pp['name']}")

    # Seed shop products for events (organizer's boutique linked to provider)
    seed_products = [
        {"product_id": "prod_seed_01", "event_id": "evt_seed_marathon_lyon", "organizer_id": "user_org_001", "provider_id": "user_provider_001",
         "name": "T-shirt Marathon Lyon 2026", "description": "T-shirt officiel du Marathon de Lyon, impression sublimation avec le parcours imprime au dos.", "category": "Textile",
         "price": 35, "sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["Noir", "Blanc", "Orange"], "stock": 200, "sold": 0, "organizer_commission": 5,
         "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600", "source": "provider", "active": True},
        {"product_id": "prod_seed_02", "event_id": "evt_seed_marathon_lyon", "organizer_id": "user_org_001", "provider_id": "user_provider_001",
         "name": "Casquette Marathon Lyon", "description": "Casquette officielle legere avec protection UV.", "category": "Accessoire",
         "price": 22, "sizes": ["Unique"], "colors": ["Noir", "Blanc"], "stock": 100, "sold": 0, "organizer_commission": 3,
         "image_url": "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=600", "source": "provider", "active": True},
        {"product_id": "prod_seed_03", "event_id": "evt_seed_marathon_lyon", "organizer_id": "user_org_001", "provider_id": "user_provider_001",
         "name": "Gourde Marathon Lyon", "description": "Gourde isotherme 750ml gravee au laser.", "category": "Gourde",
         "price": 28, "sizes": ["Unique"], "colors": ["Argent", "Noir"], "stock": 80, "sold": 0, "organizer_commission": 4,
         "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600", "source": "provider", "active": True},
        {"product_id": "prod_seed_04", "event_id": "evt_seed_trail_alpes", "organizer_id": "user_org_001", "provider_id": "user_provider_001",
         "name": "Sweat Trail des Alpes", "description": "Sweat coton bio 320g avec broderie logo Trail des Alpes.", "category": "Textile",
         "price": 55, "sizes": ["S", "M", "L", "XL"], "colors": ["Gris chine", "Noir"], "stock": 80, "sold": 0, "organizer_commission": 5,
         "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600", "source": "provider", "active": True},
        {"product_id": "prod_seed_05", "event_id": "evt_seed_trail_alpes", "organizer_id": "user_org_001", "provider_id": "user_provider_001",
         "name": "Sac a dos Trail 15L", "description": "Sac ultra-leger avec poche a eau, filet de compression.", "category": "Sac",
         "price": 65, "sizes": ["S/M", "L/XL"], "colors": ["Noir/Orange"], "stock": 50, "sold": 0, "organizer_commission": 7,
         "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600", "source": "provider", "active": True},
        {"product_id": "prod_seed_06", "event_id": "evt_seed_cyclo_beaujolais", "organizer_id": "user_org_001", "provider_id": "user_provider_001",
         "name": "Maillot Cyclo Beaujolais", "description": "Maillot cycliste coupe pro, tissu respirant avec zip integral.", "category": "Textile",
         "price": 45, "sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["Rouge/Noir"], "stock": 120, "sold": 0, "organizer_commission": 5,
         "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600", "source": "provider", "active": True},
        {"product_id": "prod_seed_07", "event_id": "evt_seed_triathlon_annecy", "organizer_id": "user_org_001", "provider_id": "user_provider_001",
         "name": "Tri-suit Annecy", "description": "Combinaison triathlon avec pad velo integre, sechage rapide.", "category": "Textile",
         "price": 85, "sizes": ["S", "M", "L", "XL"], "colors": ["Bleu/Blanc"], "stock": 60, "sold": 0, "organizer_commission": 8,
         "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600", "source": "provider", "active": True},
        {"product_id": "prod_seed_08", "event_id": "evt_seed_triathlon_annecy", "organizer_id": "user_org_001", "provider_id": "user_provider_001",
         "name": "Medaille Finisher Triathlon", "description": "Medaille en metal emaillee avec gravure nom et temps.", "category": "Accessoire",
         "price": 15, "sizes": ["Unique"], "colors": [], "stock": 300, "sold": 0, "organizer_commission": 3,
         "image_url": "https://images.unsplash.com/photo-1567427361984-0cbe7396fc6c?w=600", "source": "provider", "active": True}
    ]
    for prod in seed_products:
        existing = await db.products.find_one({"product_id": prod["product_id"]})
        if not existing:
            await db.products.insert_one(prod)
            logger.info(f"Seed: created product {prod['name']} for {prod['event_id']}")


@app.on_event("shutdown")
async def shutdown_db_client():
    from deps import client
    client.close()
