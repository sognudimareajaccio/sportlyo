import os
import asyncio
import logging
import resend
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


async def send_email(to: str, subject: str, html: str):
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping email")
        return None
    try:
        params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}: {result}")
        return result
    except Exception as e:
        logger.error(f"Email send failed to {to}: {e}")
        return None


def _base(content: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{{margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}}
.wrap{{max-width:600px;margin:0 auto;background:#fff}}
.header{{background:#1e293b;padding:32px 40px;text-align:center}}
.header img{{height:40px}}
.header h1{{color:#fff;font-size:14px;letter-spacing:3px;text-transform:uppercase;margin:12px 0 0}}
.body{{padding:40px}}
.hero{{background:#f97316;color:#fff;padding:32px 40px;text-align:center}}
.hero h2{{margin:0;font-size:24px;font-weight:800;text-transform:uppercase;letter-spacing:1px}}
.hero p{{margin:8px 0 0;opacity:.85;font-size:14px}}
.info-grid{{border:1px solid #e2e8f0;margin:24px 0}}
.info-row{{display:flex;border-bottom:1px solid #e2e8f0}}
.info-row:last-child{{border-bottom:none}}
.info-label{{background:#f8fafc;padding:12px 16px;width:40%;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px}}
.info-value{{padding:12px 16px;width:60%;font-size:14px;color:#1e293b;font-weight:500}}
.btn{{display:inline-block;background:#f97316;color:#fff!important;text-decoration:none;padding:14px 32px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:24px 0}}
.footer{{background:#1e293b;padding:24px 40px;text-align:center}}
.footer p{{color:#94a3b8;font-size:12px;margin:4px 0}}
.footer a{{color:#f97316;text-decoration:none}}
.badge{{display:inline-block;background:#f97316;color:#fff;padding:4px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px}}
.highlight{{background:#fff7ed;border-left:4px solid #f97316;padding:16px 20px;margin:20px 0;font-size:14px;color:#1e293b}}
</style></head>
<body><div class="wrap">
<div class="header">
<div style="color:#f97316;font-size:28px;font-weight:900;letter-spacing:2px">SPORTLYO</div>
<h1>Plateforme d'inscription sportive</h1>
</div>
{content}
<div class="footer">
<p style="color:#f97316;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase">SPORTLYO</p>
<p>La plateforme d'inscription aux événements sportifs</p>
<p style="margin-top:12px">Conception Plateforme <a href="https://www.webisula.com/">WEBISULA</a></p>
</div>
</div></body></html>"""


def email_welcome(name: str) -> tuple:
    subject = "Bienvenue sur SportLyo !"
    html = _base(f"""
<div class="hero">
<h2>Bienvenue, {name} !</h2>
<p>Votre compte SportLyo a été créé avec succès</p>
</div>
<div class="body">
<p style="font-size:16px;color:#1e293b;line-height:1.7">
Vous faites désormais partie de la communauté <strong>SportLyo</strong>.
Découvrez des centaines d'événements sportifs et inscrivez-vous en quelques clics.
</p>
<div class="highlight">
Explorez les courses, trails, triathlons et bien plus encore. Votre prochaine aventure sportive commence ici.
</div>
<div style="text-align:center">
<a href="https://orga-landing-preview.preview.emergentagent.com/events?preview=SPORTLYO2026" class="btn">Découvrir les événements</a>
</div>
</div>""")
    return subject, html


def email_registration_confirmed(
    participant_name: str,
    event_title: str,
    race_name: str,
    bib_number: str,
    event_date: str,
    event_location: str,
    amount: float,
    qr_code: str
) -> tuple:
    subject = f"Inscription confirmée - {event_title}"
    date_display = event_date or "À confirmer"
    location_display = event_location or "Voir page événement"

    html = _base(f"""
<div class="hero">
<h2>Inscription confirmée</h2>
<p>{event_title}</p>
</div>
<div class="body">
<p style="font-size:16px;color:#1e293b;line-height:1.7">
Félicitations <strong>{participant_name}</strong> ! Votre inscription a bien été enregistrée.
</p>

<div class="info-grid">
<div class="info-row"><div class="info-label">Événement</div><div class="info-value"><strong>{event_title}</strong></div></div>
<div class="info-row"><div class="info-label">Épreuve</div><div class="info-value">{race_name or 'Principale'}</div></div>
<div class="info-row"><div class="info-label">Dossard</div><div class="info-value"><span class="badge">N° {bib_number}</span></div></div>
<div class="info-row"><div class="info-label">Date</div><div class="info-value">{date_display}</div></div>
<div class="info-row"><div class="info-label">Lieu</div><div class="info-value">{location_display}</div></div>
<div class="info-row"><div class="info-label">Montant</div><div class="info-value"><strong>{amount}€</strong> (frais inclus)</div></div>
</div>

{('<div style="text-align:center;margin:24px 0"><img src="' + qr_code + '" alt="QR Code" style="width:180px;height:180px" /><p style="font-size:12px;color:#64748b;margin-top:8px">Présentez ce QR code le jour de l événement</p></div>') if qr_code and qr_code.startswith('data:') else ''}

<div class="highlight">
Pensez à télécharger votre billet depuis votre espace participant. N'oubliez pas vos documents PPS si requis.
</div>

<div style="text-align:center">
<a href="https://orga-landing-preview.preview.emergentagent.com/dashboard?preview=SPORTLYO2026" class="btn">Mon espace participant</a>
</div>
</div>""")
    return subject, html


def email_new_registration_organizer(
    organizer_name: str,
    participant_name: str,
    event_title: str,
    race_name: str,
    bib_number: str,
    current_count: int,
    max_count: int
) -> tuple:
    subject = f"Nouvelle inscription - {event_title}"
    pct = round((current_count / max_count) * 100) if max_count > 0 else 0

    html = _base(f"""
<div class="hero">
<h2>Nouvelle inscription !</h2>
<p>{event_title}</p>
</div>
<div class="body">
<p style="font-size:16px;color:#1e293b;line-height:1.7">
Bonjour <strong>{organizer_name}</strong>, un nouveau participant vient de s'inscrire à votre événement.
</p>

<div class="info-grid">
<div class="info-row"><div class="info-label">Participant</div><div class="info-value"><strong>{participant_name}</strong></div></div>
<div class="info-row"><div class="info-label">Épreuve</div><div class="info-value">{race_name or 'Principale'}</div></div>
<div class="info-row"><div class="info-label">Dossard</div><div class="info-value"><span class="badge">N° {bib_number}</span></div></div>
<div class="info-row"><div class="info-label">Remplissage</div><div class="info-value">{current_count}/{max_count} ({pct}%)</div></div>
</div>

<div style="text-align:center">
<a href="https://orga-landing-preview.preview.emergentagent.com/organizer?preview=SPORTLYO2026" class="btn">Tableau de bord</a>
</div>
</div>""")
    return subject, html
