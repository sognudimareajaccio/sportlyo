import os
import asyncio
import logging
import resend
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
LOGO_URL = os.environ.get("SITE_URL", "https://orga-landing-preview.preview.emergentagent.com") + "/logo-email.png"
SITE_URL = os.environ.get("SITE_URL", "https://orga-landing-preview.preview.emergentagent.com")

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
    return f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:20px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px">

<!-- Header -->
<tr><td style="background:#0f172a;padding:28px 40px;text-align:center">
<img src="{LOGO_URL}" alt="SportLyo" style="height:48px;display:inline-block" />
</td></tr>

{content}

<!-- Footer -->
<tr><td style="background:#0f172a;padding:28px 40px;text-align:center">
<img src="{LOGO_URL}" alt="SportLyo" style="height:32px;display:inline-block;margin-bottom:12px" />
<p style="color:#94a3b8;font-size:12px;margin:4px 0;font-family:-apple-system,sans-serif">La plateforme d'inscription aux événements sportifs</p>
<p style="color:#94a3b8;font-size:11px;margin:12px 0 0;font-family:-apple-system,sans-serif">Conception Plateforme <a href="https://www.webisula.com/" style="color:#ff4500;text-decoration:none;font-weight:700">WEBISULA</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>'''


def email_welcome(name: str) -> tuple:
    subject = "Bienvenue sur SportLyo !"
    html = _base(f'''
<!-- Hero -->
<tr><td style="background:#ff4500;color:#ffffff;padding:32px 40px;text-align:center">
<h2 style="margin:0;font-size:24px;font-weight:800;text-transform:uppercase;letter-spacing:1px;font-family:-apple-system,sans-serif">Bienvenue, {name} !</h2>
<p style="margin:8px 0 0;opacity:.85;font-size:14px;font-family:-apple-system,sans-serif">Votre compte SportLyo a été créé avec succès</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:40px">
<p style="font-size:16px;color:#0f172a;line-height:1.7;font-family:-apple-system,sans-serif">
Vous faites désormais partie de la communauté <strong>SportLyo</strong>.
Découvrez des centaines d'événements sportifs et inscrivez-vous en quelques clics.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-left:4px solid #ff4500;background:#fff7ed">
<tr><td style="padding:16px 20px;font-size:14px;color:#0f172a;font-family:-apple-system,sans-serif">
Explorez les courses, trails, triathlons et bien plus encore. Votre prochaine aventure sportive commence ici.
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0">
<a href="{SITE_URL}/events?preview=SPORTLYO2026" style="display:inline-block;background:#ff4500;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-family:-apple-system,sans-serif">Découvrir les événements</a>
</td></tr></table>
</td></tr>''')
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

    qr_section = ""
    if qr_code and qr_code.startswith("data:"):
        qr_section = f'''<tr><td align="center" style="padding:24px 0">
<img src="{qr_code}" alt="QR Code" style="width:160px;height:160px" />
<p style="font-size:11px;color:#64748b;margin-top:8px;font-family:-apple-system,sans-serif">Présentez ce QR code le jour de l événement</p>
</td></tr>'''

    html = _base(f'''
<!-- Hero -->
<tr><td style="background:#ff4500;color:#ffffff;padding:32px 40px;text-align:center">
<h2 style="margin:0;font-size:24px;font-weight:800;text-transform:uppercase;letter-spacing:1px;font-family:-apple-system,sans-serif">Inscription confirmée</h2>
<p style="margin:8px 0 0;opacity:.85;font-size:14px;font-family:-apple-system,sans-serif">{event_title}</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:40px">
<p style="font-size:16px;color:#0f172a;line-height:1.7;font-family:-apple-system,sans-serif">
Félicitations <strong>{participant_name}</strong> ! Votre inscription a bien été enregistrée.
</p>

<!-- Info Grid -->
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;margin:24px 0">
<tr>
<td style="background:#f8fafc;padding:12px 16px;width:40%;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">Événement</td>
<td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:500;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif"><strong>{event_title}</strong></td>
</tr>
<tr>
<td style="background:#f8fafc;padding:12px 16px;width:40%;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">Épreuve</td>
<td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:500;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">{race_name or 'Principale'}</td>
</tr>
<tr>
<td style="background:#f8fafc;padding:12px 16px;width:40%;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">Dossard</td>
<td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:500;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif"><span style="display:inline-block;background:#ff4500;color:#fff;padding:3px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px">N° {bib_number}</span></td>
</tr>
<tr>
<td style="background:#f8fafc;padding:12px 16px;width:40%;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">Date</td>
<td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:500;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">{date_display}</td>
</tr>
<tr>
<td style="background:#f8fafc;padding:12px 16px;width:40%;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">Lieu</td>
<td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:500;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">{location_display}</td>
</tr>
<tr>
<td style="background:#f8fafc;padding:12px 16px;width:40%;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-family:-apple-system,sans-serif">Montant</td>
<td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:500;font-family:-apple-system,sans-serif"><strong>{amount}€</strong> (frais inclus)</td>
</tr>
</table>

{qr_section}

<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-left:4px solid #ff4500;background:#fff7ed">
<tr><td style="padding:16px 20px;font-size:14px;color:#0f172a;font-family:-apple-system,sans-serif">
Pensez à télécharger votre billet depuis votre espace participant. N oubliez pas vos documents PPS si requis.
</td></tr></table>

<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0">
<a href="{SITE_URL}/dashboard?preview=SPORTLYO2026" style="display:inline-block;background:#ff4500;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-family:-apple-system,sans-serif">Mon espace participant</a>
</td></tr></table>
</td></tr>''')
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

    html = _base(f'''
<!-- Hero -->
<tr><td style="background:#ff4500;color:#ffffff;padding:32px 40px;text-align:center">
<h2 style="margin:0;font-size:24px;font-weight:800;text-transform:uppercase;letter-spacing:1px;font-family:-apple-system,sans-serif">Nouvelle inscription !</h2>
<p style="margin:8px 0 0;opacity:.85;font-size:14px;font-family:-apple-system,sans-serif">{event_title}</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:40px">
<p style="font-size:16px;color:#0f172a;line-height:1.7;font-family:-apple-system,sans-serif">
Bonjour <strong>{organizer_name}</strong>, un nouveau participant vient de s'inscrire à votre événement.
</p>

<!-- Info Grid -->
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;margin:24px 0">
<tr>
<td style="background:#f8fafc;padding:12px 16px;width:40%;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">Participant</td>
<td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:500;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif"><strong>{participant_name}</strong></td>
</tr>
<tr>
<td style="background:#f8fafc;padding:12px 16px;width:40%;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">Épreuve</td>
<td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:500;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">{race_name or 'Principale'}</td>
</tr>
<tr>
<td style="background:#f8fafc;padding:12px 16px;width:40%;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif">Dossard</td>
<td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:500;border-bottom:1px solid #e2e8f0;font-family:-apple-system,sans-serif"><span style="display:inline-block;background:#ff4500;color:#fff;padding:3px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px">N° {bib_number}</span></td>
</tr>
<tr>
<td style="background:#f8fafc;padding:12px 16px;width:40%;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-family:-apple-system,sans-serif">Remplissage</td>
<td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:500;font-family:-apple-system,sans-serif">{current_count}/{max_count} ({pct}%)</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0">
<a href="{SITE_URL}/organizer?preview=SPORTLYO2026" style="display:inline-block;background:#ff4500;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-family:-apple-system,sans-serif">Tableau de bord</a>
</td></tr></table>
</td></tr>''')
    return subject, html
