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



# ===== EMAIL TEMPLATES =====

def _build_trial_email(template: str, partner_name: str, days_left: int, trial_end_str: str, subscribe_url: str) -> dict:
    """Build HTML email for trial reminders."""
    brand = "#FF5A1F"
    if template == "reminder_3days":
        subject = f"SportLyo — Votre essai gratuit se termine dans {days_left} jour{'s' if days_left > 1 else ''}"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
          <div style="background:{brand};padding:24px 32px;">
            <h1 style="color:#fff;font-size:22px;margin:0;">SPORTLYO</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#1e293b;font-size:20px;">Bonjour {partner_name},</h2>
            <p style="color:#475569;line-height:1.6;">Votre <strong>essai gratuit de 14 jours</strong> se termine dans <strong style="color:{brand};">{days_left} jour{'s' if days_left > 1 else ''}</strong> (le {trial_end_str}).</p>
            <p style="color:#475569;line-height:1.6;">Pour continuer a beneficier de toutes les fonctionnalites de la plateforme et rester visible aupres des organisateurs d'evenements sportifs, pensez a activer votre abonnement.</p>
            <div style="background:#f8fafc;border-left:4px solid {brand};padding:16px 20px;margin:24px 0;">
              <p style="margin:0;font-size:14px;color:#64748b;">Abonnement Partenaire</p>
              <p style="margin:4px 0 0;font-size:28px;font-weight:bold;color:{brand};">19€<span style="font-size:14px;color:#94a3b8;">/mois</span></p>
              <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">Engagement 12 mois · Sans renouvellement automatique</p>
            </div>
            <a href="{subscribe_url}" style="display:inline-block;background:{brand};color:#fff;padding:14px 32px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:1px;margin-top:8px;">S'ABONNER MAINTENANT</a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Si vous avez des questions, n'hesitez pas a nous contacter.</p>
          </div>
          <div style="background:#f1f5f9;padding:16px 32px;text-align:center;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">SportLyo — La plateforme des evenements sportifs</p>
          </div>
        </div>"""
    elif template == "expired":
        subject = "SportLyo — Votre essai gratuit est termine"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
          <div style="background:{brand};padding:24px 32px;">
            <h1 style="color:#fff;font-size:22px;margin:0;">SPORTLYO</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#1e293b;font-size:20px;">Bonjour {partner_name},</h2>
            <p style="color:#475569;line-height:1.6;">Votre <strong>essai gratuit de 14 jours</strong> est arrive a son terme aujourd'hui.</p>
            <p style="color:#475569;line-height:1.6;">Pour maintenir votre profil actif et continuer a recevoir des demandes d'organisateurs, activez votre abonnement des maintenant.</p>
            <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px 20px;margin:24px 0;">
              <p style="margin:0;font-size:14px;color:#dc2626;font-weight:bold;">Sans abonnement, votre profil ne sera plus visible par les organisateurs.</p>
            </div>
            <div style="background:#f8fafc;padding:16px 20px;margin:24px 0;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:bold;color:{brand};">19€<span style="font-size:14px;color:#94a3b8;">/mois</span></p>
            </div>
            <a href="{subscribe_url}" style="display:inline-block;background:{brand};color:#fff;padding:14px 32px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:1px;">ACTIVER MON ABONNEMENT</a>
          </div>
          <div style="background:#f1f5f9;padding:16px 32px;text-align:center;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">SportLyo — La plateforme des evenements sportifs</p>
          </div>
        </div>"""
    else:  # last_chance (J+1)
        subject = "SportLyo — Derniere chance : votre compte sera desactive"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
          <div style="background:#1e293b;padding:24px 32px;">
            <h1 style="color:#fff;font-size:22px;margin:0;">SPORTLYO</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#1e293b;font-size:20px;">Bonjour {partner_name},</h2>
            <p style="color:#475569;line-height:1.6;">Votre essai gratuit a expire <strong>hier</strong>. Votre compte partenaire sera bientot desactive si vous n'activez pas votre abonnement.</p>
            <div style="background:#fef2f2;border:2px solid #ef4444;padding:20px;margin:24px 0;text-align:center;">
              <p style="margin:0;font-size:16px;color:#dc2626;font-weight:bold;">DERNIERE CHANCE</p>
              <p style="margin:8px 0 0;font-size:13px;color:#64748b;">Activez votre abonnement pour eviter la desactivation de votre compte</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="{subscribe_url}" style="display:inline-block;background:{brand};color:#fff;padding:16px 40px;text-decoration:none;font-weight:bold;font-size:16px;letter-spacing:1px;">S'ABONNER — 19€/MOIS</a>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center;">Engagement 12 mois · Sans renouvellement automatique</p>
          </div>
          <div style="background:#f1f5f9;padding:16px 32px;text-align:center;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">SportLyo — La plateforme des evenements sportifs</p>
          </div>
        </div>"""
    return {"subject": subject, "html": body}


async def _send_trial_email(email: str, template: str, partner_name: str, days_left: int, trial_end_str: str, subscription_id: str):
    """Send trial reminder email via Resend and log it."""
    try:
        import resend
        resend.api_key = os.environ.get("RESEND_API_KEY", "")
        sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        frontend_url = os.environ.get("FRONTEND_URL", "")
        subscribe_url = f"{frontend_url}/provider?tab=subscription"
        email_data = _build_trial_email(template, partner_name, days_left, trial_end_str, subscribe_url)
        resend.Emails.send({
            "from": sender_email,
            "to": [email],
            "subject": email_data["subject"],
            "html": email_data["html"]
        })
        # Log email sent
        await db.email_log.insert_one({
            "email_id": f"email_{uuid.uuid4().hex[:12]}",
            "subscription_id": subscription_id,
            "recipient": email,
            "template": template,
            "subject": email_data["subject"],
            "status": "sent",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Trial email sent: {template} -> {email}")
        return True
    except Exception as e:
        logger.warning(f"Failed to send trial email ({template}) to {email}: {e}")
        await db.email_log.insert_one({
            "email_id": f"email_{uuid.uuid4().hex[:12]}",
            "subscription_id": subscription_id,
            "recipient": email,
            "template": template,
            "subject": f"[FAILED] {template}",
            "status": "failed",
            "error": str(e),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return False


@router.post("/subscriptions/check-trials")
async def check_trial_expirations(current_user: dict = Depends(get_current_user)):
    """Check all trials and send appropriate reminder emails. Can be triggered by admin."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin uniquement")
    now = datetime.now(timezone.utc)
    trials = await db.subscriptions.find({"status": {"$in": ["trial", "trial_expired"]}}, {"_id": 0}).to_list(500)
    results = {"emails_sent": 0, "trials_expired": 0, "already_notified": 0, "errors": 0, "details": []}
    for sub in trials:
        trial_end = datetime.fromisoformat(sub["trial_end"].replace("Z", "+00:00"))
        days_left = (trial_end - now).days
        trial_end_str = trial_end.strftime("%d/%m/%Y")
        partner_name = sub.get("user_name", "Partenaire")
        email = sub.get("user_email", "")
        sid = sub["subscription_id"]
        if not email:
            continue
        # Determine which template to send
        template = None
        if 1 <= days_left <= 3:
            template = "reminder_3days"
        elif days_left == 0 or (days_left < 0 and days_left >= -1 and sub["status"] == "trial"):
            template = "expired"
            # Auto-expire trial
            await db.subscriptions.update_one({"subscription_id": sid}, {"$set": {"status": "trial_expired"}})
            results["trials_expired"] += 1
        elif days_left < -1 and days_left >= -3:
            template = "last_chance"
        if not template:
            continue
        # Check if already sent this template for this subscription
        already = await db.email_log.find_one({"subscription_id": sid, "template": template, "status": "sent"})
        if already:
            results["already_notified"] += 1
            results["details"].append({"partner": partner_name, "template": template, "status": "already_sent"})
            continue
        sent = await _send_trial_email(email, template, partner_name, days_left, trial_end_str, sid)
        if sent:
            results["emails_sent"] += 1
            results["details"].append({"partner": partner_name, "email": email, "template": template, "status": "sent", "days_left": days_left})
        else:
            results["errors"] += 1
            results["details"].append({"partner": partner_name, "template": template, "status": "error"})
    return results


@router.get("/subscriptions/email-log")
async def get_email_log(current_user: dict = Depends(get_current_user)):
    """Get email log for admin."""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin uniquement")
    logs = await db.email_log.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"emails": logs}
