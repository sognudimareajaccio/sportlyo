from fastapi import APIRouter, HTTPException, Depends, Request
from deps import db, get_current_user, SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT
from datetime import datetime, timezone, timedelta
import uuid
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

SUBSCRIPTION_PRICE = 19.00
TRIAL_DAYS = 14
COMMITMENT_MONTHS = 12


@router.get("/subscriptions/my")
async def get_my_subscription(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Partenaires uniquement")
    sub = await db.subscriptions.find_one(
        {"user_id": current_user['user_id']},
        {"_id": 0}
    )
    if not sub:
        # Auto-create trial for existing providers without subscription
        now = datetime.now(timezone.utc)
        trial_end = now + timedelta(days=TRIAL_DAYS)
        sub = {
            "subscription_id": f"sub_{uuid.uuid4().hex[:12]}",
            "user_id": current_user['user_id'],
            "user_name": current_user.get('name', ''),
            "user_email": current_user.get('email', ''),
            "status": "trial",
            "plan": "partner_monthly",
            "price": SUBSCRIPTION_PRICE,
            "trial_start": now.isoformat(),
            "trial_end": trial_end.isoformat(),
            "commitment_months": COMMITMENT_MONTHS,
            "payments_made": 0,
            "total_paid": 0,
            "subscription_start": None,
            "current_period_end": None,
            "created_at": now.isoformat(),
            "cancelled_at": None,
            "payment_history": []
        }
        await db.subscriptions.insert_one(sub)
        del sub["_id"]
        return {"subscription": sub}
    now = datetime.now(timezone.utc)
    # Auto-check trial expiry
    if sub.get("status") == "trial":
        trial_end = datetime.fromisoformat(sub["trial_end"].replace("Z", "+00:00"))
        if now > trial_end:
            await db.subscriptions.update_one(
                {"user_id": current_user['user_id']},
                {"$set": {"status": "trial_expired"}}
            )
            sub["status"] = "trial_expired"
    # Check if active subscription expired
    if sub.get("status") == "active" and sub.get("current_period_end"):
        period_end = datetime.fromisoformat(sub["current_period_end"].replace("Z", "+00:00"))
        if now > period_end:
            await db.subscriptions.update_one(
                {"user_id": current_user['user_id']},
                {"$set": {"status": "expired"}}
            )
            sub["status"] = "expired"
    return {"subscription": sub}


@router.post("/subscriptions/start-trial")
async def start_trial(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Partenaires uniquement")
    existing = await db.subscriptions.find_one({"user_id": current_user['user_id']})
    if existing:
        raise HTTPException(status_code=400, detail="Abonnement deja existant")
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=TRIAL_DAYS)
    sub = {
        "subscription_id": f"sub_{uuid.uuid4().hex[:12]}",
        "user_id": current_user['user_id'],
        "user_name": current_user.get('name', ''),
        "user_email": current_user.get('email', ''),
        "status": "trial",
        "plan": "partner_monthly",
        "price": SUBSCRIPTION_PRICE,
        "trial_start": now.isoformat(),
        "trial_end": trial_end.isoformat(),
        "commitment_months": COMMITMENT_MONTHS,
        "payments_made": 0,
        "total_paid": 0,
        "subscription_start": None,
        "current_period_end": None,
        "created_at": now.isoformat(),
        "cancelled_at": None,
        "payment_history": []
    }
    await db.subscriptions.insert_one(sub)
    del sub["_id"]
    return {"subscription": sub, "message": f"Essai gratuit de {TRIAL_DAYS} jours active !"}


@router.post("/subscriptions/create-payment")
async def create_subscription_payment(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Partenaires uniquement")
    sub = await db.subscriptions.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Aucun abonnement trouve")
    if sub["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Abonnement annule")
    amount_cents = int(SUBSCRIPTION_PRICE * 100)
    link_id = f"subpay_{uuid.uuid4().hex[:12]}"
    payment_url = ""
    description = f"Abonnement Partenaire SportLyo - {SUBSCRIPTION_PRICE}€/mois"
    if SQUARE_ACCESS_TOKEN:
        try:
            from square import Square as SquareClient
            from square.environment import SquareEnvironment
            env = SquareEnvironment.PRODUCTION if SQUARE_ENVIRONMENT == 'production' else SquareEnvironment.SANDBOX
            client = SquareClient(token=SQUARE_ACCESS_TOKEN, environment=env)
            frontend_url = os.environ.get('FRONTEND_URL', '')
            result = client.checkout.create_payment_link(body={
                "idempotency_key": str(uuid.uuid4()),
                "order": {
                    "location_id": SQUARE_LOCATION_ID,
                    "line_items": [{
                        "name": description,
                        "quantity": "1",
                        "base_price_money": {"amount": amount_cents, "currency": "EUR"}
                    }]
                },
                "checkout_options": {
                    "allow_tipping": False,
                    "redirect_url": f"{frontend_url}/provider?subscription=success&ref={link_id}"
                }
            })
            if hasattr(result, 'payment_link') and result.payment_link:
                payment_url = result.payment_link.url if hasattr(result.payment_link, 'url') else str(getattr(result.payment_link, 'long_url', ''))
        except Exception as e:
            logger.warning(f"Square subscription payment link error: {e}")
    if not payment_url:
        payment_url = f"https://checkout.square.site/simulated/{link_id}?amount={SUBSCRIPTION_PRICE}&desc=Abonnement+Partenaire"
    await db.subscription_payments.insert_one({
        "payment_id": link_id,
        "subscription_id": sub["subscription_id"],
        "user_id": current_user['user_id'],
        "amount": SUBSCRIPTION_PRICE,
        "payment_url": payment_url,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"payment_url": payment_url, "payment_id": link_id, "amount": SUBSCRIPTION_PRICE}


@router.post("/subscriptions/confirm-payment/{payment_id}")
async def confirm_subscription_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['provider', 'admin']:
        raise HTTPException(status_code=403, detail="Non autorise")
    payment = await db.subscription_payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouve")
    if payment["status"] == "completed":
        raise HTTPException(status_code=400, detail="Paiement deja confirme")
    now = datetime.now(timezone.utc)
    period_end = now + timedelta(days=30)
    await db.subscription_payments.update_one(
        {"payment_id": payment_id},
        {"$set": {"status": "completed", "confirmed_at": now.isoformat()}}
    )
    sub = await db.subscriptions.find_one({"subscription_id": payment["subscription_id"]}, {"_id": 0})
    update = {
        "status": "active",
        "current_period_end": period_end.isoformat(),
        "payments_made": (sub.get("payments_made", 0) + 1) if sub else 1,
        "total_paid": round((sub.get("total_paid", 0) + SUBSCRIPTION_PRICE), 2) if sub else SUBSCRIPTION_PRICE
    }
    if not sub.get("subscription_start"):
        update["subscription_start"] = now.isoformat()
    await db.subscriptions.update_one(
        {"subscription_id": payment["subscription_id"]},
        {
            "$set": update,
            "$push": {"payment_history": {
                "payment_id": payment_id,
                "amount": SUBSCRIPTION_PRICE,
                "date": now.isoformat(),
                "period_end": period_end.isoformat()
            }}
        }
    )
    return {"message": "Paiement confirme ! Abonnement actif.", "period_end": period_end.isoformat()}


@router.post("/subscriptions/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Partenaires uniquement")
    sub = await db.subscriptions.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Aucun abonnement trouve")
    if sub["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Deja annule")
    now = datetime.now(timezone.utc)
    await db.subscriptions.update_one(
        {"user_id": current_user['user_id']},
        {"$set": {"status": "cancelled", "cancelled_at": now.isoformat()}}
    )
    return {"message": "Abonnement annule. Vous conservez l'acces jusqu'a la fin de la periode en cours."}


# Admin endpoints
@router.get("/admin/subscriptions")
async def admin_list_subscriptions(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin uniquement")
    subs = await db.subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    stats = {
        "total": len(subs),
        "trial": len([s for s in subs if s["status"] == "trial"]),
        "active": len([s for s in subs if s["status"] == "active"]),
        "expired": len([s for s in subs if s["status"] in ["expired", "trial_expired"]]),
        "cancelled": len([s for s in subs if s["status"] == "cancelled"]),
        "total_revenue": sum(s.get("total_paid", 0) for s in subs)
    }
    return {"subscriptions": subs, "stats": stats}
