from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import StreamingResponse
from deps import db, get_current_user, SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT, STRIPE_API_KEY, PLATFORM_COMMISSION
from io import BytesIO, StringIO
import csv
import uuid
import os
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# ============== SQUARE PAYMENT LINKS ==============

@router.post("/payments/create-link")
async def create_payment_link(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    link_type = data.get("type")
    source_id = data.get("source_id")
    base_amount = float(data.get("amount", 0))
    description = data.get("description", "Paiement SportLyo")
    if not source_id or base_amount <= 0:
        raise HTTPException(status_code=400, detail="source_id et amount requis")
    platform_fee = round(base_amount * PLATFORM_COMMISSION, 2)
    total_amount = round(base_amount + platform_fee, 2)
    amount_cents = int(total_amount * 100)
    link_id = f"link_{uuid.uuid4().hex[:12]}"
    payment_url = ""
    if SQUARE_ACCESS_TOKEN:
        try:
            from square import Square as SquareClient
            from square.environment import SquareEnvironment
            env = SquareEnvironment.PRODUCTION if SQUARE_ENVIRONMENT == 'production' else SquareEnvironment.SANDBOX
            client = SquareClient(token=SQUARE_ACCESS_TOKEN, environment=env)
            result = client.checkout.create_payment_link(body={
                "idempotency_key": str(uuid.uuid4()),
                "order": {
                    "location_id": SQUARE_LOCATION_ID,
                    "line_items": [
                        {"name": description, "quantity": "1", "base_price_money": {"amount": int(base_amount * 100), "currency": "EUR"}},
                        {"name": "Frais de fonctionnement plateforme (5%)", "quantity": "1", "base_price_money": {"amount": int(platform_fee * 100), "currency": "EUR"}}
                    ]
                },
                "checkout_options": {"allow_tipping": False, "redirect_url": f"{os.environ.get('FRONTEND_URL', '')}/organizer?payment=success&ref={source_id}"}
            })
            if hasattr(result, 'payment_link') and result.payment_link:
                payment_url = result.payment_link.url if hasattr(result.payment_link, 'url') else str(result.payment_link.long_url if hasattr(result.payment_link, 'long_url') else '')
        except Exception as e:
            logger.warning(f"Square payment link error: {e}")
    if not payment_url:
        payment_url = f"https://checkout.square.site/simulated/{link_id}?amount={total_amount}&desc={description}"
    link_record = {
        "link_id": link_id, "type": link_type, "source_id": source_id,
        "organizer_id": current_user['user_id'], "base_amount": base_amount,
        "platform_fee": platform_fee, "total_amount": total_amount,
        "amount": total_amount,
        "description": description, "payment_url": payment_url,
        "payment_status": "pending", "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_links.insert_one(link_record)
    update_fields = {"payment_link": payment_url, "payment_status": "pending", "base_amount": base_amount, "platform_fee": platform_fee, "total_amount": total_amount}
    if link_type == "sponsor":
        await db.sponsors.update_one({"sponsor_id": source_id}, {"$set": update_fields})
    elif link_type == "booking":
        await db.corporate_bookings.update_one({"booking_id": source_id}, {"$set": update_fields})
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}", "type": link_type,
        "source_id": source_id, "organizer_id": current_user['user_id'],
        "base_amount": base_amount, "platform_fee": platform_fee,
        "amount": total_amount, "description": description, "payment_url": payment_url,
        "payment_status": "pending", "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.commissions.insert_one({
        "commission_id": f"com_{uuid.uuid4().hex[:12]}", "type": link_type,
        "source_id": source_id, "organizer_id": current_user['user_id'],
        "base_amount": base_amount, "commission_amount": platform_fee,
        "description": f"Frais plateforme 5% - {description}",
        "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"payment_url": payment_url, "link_id": link_id, "base_amount": base_amount, "platform_fee": platform_fee, "total_amount": total_amount}


# ============== RECU FISCAL CERFA 11580 ==============

@router.post("/payments/confirm-payment/{source_id}")
async def confirm_payment_and_generate_receipt(source_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    sponsor = await db.sponsors.find_one({"sponsor_id": source_id, "organizer_id": current_user['user_id']}, {"_id": 0})
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor/donateur non trouve")
    organizer = await db.users.find_one({"user_id": current_user['user_id']}, {"_id": 0})
    receipt_number = f"RF-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    receipt_data = {
        "receipt_id": f"rcpt_{uuid.uuid4().hex[:12]}",
        "receipt_number": receipt_number,
        "sponsor_id": source_id,
        "organizer_id": current_user['user_id'],
        "donor_name": sponsor.get("name", ""),
        "donor_contact": sponsor.get("contact_name", ""),
        "donor_email": sponsor.get("email", ""),
        "donor_address": sponsor.get("address", ""),
        "organizer_name": organizer.get("organization_name", organizer.get("name", "")),
        "organizer_address": organizer.get("address", ""),
        "base_amount": sponsor.get("base_amount", sponsor.get("amount", 0)),
        "donation_type": sponsor.get("contribution_type", "Financier"),
        "payment_date": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.fiscal_receipts.insert_one(receipt_data)
    del receipt_data["_id"]
    await db.sponsors.update_one({"sponsor_id": source_id}, {"$set": {"payment_status": "paid", "receipt_number": receipt_number, "paid_at": datetime.now(timezone.utc).isoformat()}})
    await db.payment_links.update_one({"source_id": source_id}, {"$set": {"payment_status": "paid"}})
    await db.payment_transactions.update_one({"source_id": source_id}, {"$set": {"payment_status": "paid"}})
    await db.commissions.update_one({"source_id": source_id}, {"$set": {"status": "collected"}})
    if sponsor.get("email"):
        try:
            import resend
            resend.api_key = os.environ.get("RESEND_API_KEY", "")
            sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
            org_name = organizer.get("organization_name", organizer.get("name", "SportLyo"))
            resend.Emails.send({
                "from": sender_email,
                "to": [sponsor["email"]],
                "subject": f"Recu fiscal - {org_name} - {receipt_number}",
                "html": f"<h2>Recu fiscal N° {receipt_number}</h2><p>Cher(e) {sponsor.get('contact_name', sponsor.get('name', ''))},</p><p>Nous accusons reception de votre don de <strong>{receipt_data['base_amount']}€</strong> au profit de <strong>{org_name}</strong>.</p><p>Votre recu fiscal est disponible dans votre espace. Ce document vous permettra de beneficier de la reduction d'impot prevue par l'article 200 du Code General des Impots.</p><p>Numero de recu : <strong>{receipt_number}</strong></p><p>Cordialement,<br/>{org_name}</p>"
            })
        except Exception as e:
            logger.warning(f"Email receipt error: {e}")
    return {"message": "Paiement confirme et recu fiscal genere", "receipt": receipt_data}


@router.get("/payments/receipt/{source_id}/pdf")
async def download_fiscal_receipt(source_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    receipt = await db.fiscal_receipts.find_one({"sponsor_id": source_id, "organizer_id": current_user['user_id']}, {"_id": 0})
    if not receipt:
        raise HTTPException(status_code=404, detail="Recu fiscal non trouve")
    from fpdf import FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    # Header
    pdf.set_fill_color(30, 41, 59)
    pdf.rect(0, 0, 210, 40, 'F')
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_y(8)
    pdf.cell(0, 10, "RECU FISCAL AU TITRE DES DONS", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 8, "Article 200, 238 bis et 978 du Code General des Impots", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 8, f"N° {receipt.get('receipt_number', '')}", align="C", new_x="LMARGIN", new_y="NEXT")
    # Body
    pdf.set_text_color(30, 41, 59)
    pdf.set_y(50)
    # Section 1: Organisme beneficiaire
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_fill_color(241, 245, 249)
    pdf.cell(0, 9, "  1. ORGANISME BENEFICIAIRE", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.ln(4)
    pdf.cell(0, 7, f"Nom : {receipt.get('organizer_name', '')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Adresse : {receipt.get('organizer_address', 'Non renseignee')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, "Objet : Organisation d'evenements sportifs", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    # Section 2: Donateur
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 9, "  2. DONATEUR", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.ln(4)
    pdf.cell(0, 7, f"Nom ou raison sociale : {receipt.get('donor_name', '')}", new_x="LMARGIN", new_y="NEXT")
    if receipt.get("donor_contact"):
        pdf.cell(0, 7, f"Representant : {receipt['donor_contact']}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Adresse : {receipt.get('donor_address', 'Non renseignee')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    # Section 3: Don
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 9, "  3. DON", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.ln(4)
    payment_date = receipt.get("payment_date", "")
    try:
        dt = datetime.fromisoformat(payment_date.replace("Z", "+00:00"))
        date_str = dt.strftime("%d/%m/%Y")
    except Exception:
        date_str = payment_date[:10] if payment_date else "Non renseignee"
    base_amount = receipt.get("base_amount", 0)
    pdf.cell(0, 7, f"Date du versement : {date_str}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Montant du don : {base_amount:.2f} EUR", new_x="LMARGIN", new_y="NEXT")
    amount_words = _number_to_french_words(base_amount)
    pdf.cell(0, 7, f"Somme en toutes lettres : {amount_words} euros", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Nature du don : {receipt.get('donation_type', 'Financier')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, "Mode de versement : Paiement en ligne (carte bancaire)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    # Section 4: Cadre fiscal
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 9, "  4. CADRE FISCAL", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.ln(4)
    pdf.multi_cell(0, 6, "Le beneficiaire certifie sur l'honneur que les dons et versements qu'il recoit ouvrent droit a la reduction d'impot prevue a l'article 200 du CGI (particuliers) ou a l'article 238 bis du CGI (entreprises).")
    pdf.ln(3)
    pdf.multi_cell(0, 6, "- Particuliers : reduction d'impot de 66% du montant du don, dans la limite de 20% du revenu imposable.\n- Entreprises : reduction d'impot de 60% du montant du don, dans la limite de 20 000 EUR ou 0,5% du CA HT.")
    pdf.ln(8)
    # Signature
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 7, f"Fait a ________________, le {date_str}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.cell(95, 7, "Signature du donateur", align="C")
    pdf.cell(95, 7, "Signature et cachet de l'organisme", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(20)
    # Footer
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, f"Document genere par SportLyo - Recu N° {receipt.get('receipt_number', '')} - Ce document est un recu au sens de l'article 200 du CGI", align="C")
    buf = BytesIO()
    pdf.output(buf)
    buf.seek(0)
    filename = f"recu_fiscal_{receipt.get('receipt_number', 'RF')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


def _number_to_french_words(n):
    """Convert number to French words for fiscal receipt."""
    if n == 0:
        return "zero"
    units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
             "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"]
    tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"]
    integer_part = int(n)
    decimal_part = int(round((n - integer_part) * 100))
    def convert_below_1000(num):
        if num == 0: return ""
        if num < 20: return units[num]
        if num < 100:
            t, u = divmod(num, 10)
            if t == 7 or t == 9:
                t -= 1
                u += 10
            result = tens[t]
            if u == 1 and t not in [8]:
                result += " et un"
            elif u > 0:
                result += f"-{units[u]}"
            elif t == 8:
                result += "s"
            return result
        h, remainder = divmod(num, 100)
        result = "cent" if h == 1 else f"{units[h]} cent"
        if remainder == 0 and h > 1:
            result += "s"
        elif remainder > 0:
            result += f" {convert_below_1000(remainder)}"
        return result
    if integer_part < 1000:
        result = convert_below_1000(integer_part)
    elif integer_part < 1000000:
        thousands, remainder = divmod(integer_part, 1000)
        result = "mille" if thousands == 1 else f"{convert_below_1000(thousands)} mille"
        if remainder > 0:
            result += f" {convert_below_1000(remainder)}"
    else:
        result = str(integer_part)
    if decimal_part > 0:
        result += f" et {convert_below_1000(decimal_part)} centimes"
    return result

@router.post("/payments/process-square")
async def process_square_payment(request: Request, current_user: dict = Depends(get_current_user)):
    from square import Square as SquareClient
    data = await request.json()
    source_id = data.get('source_id')
    registration_id = data.get('registration_id')
    idempotency_key = data.get('idempotency_key', str(uuid.uuid4()))
    promo_code = data.get('promo_code')
    if not source_id:
        raise HTTPException(status_code=400, detail="Token de paiement manquant")
    registration = await db.registrations.find_one({"registration_id": registration_id, "user_id": current_user['user_id']}, {"_id": 0})
    if not registration:
        raise HTTPException(status_code=404, detail="Inscription introuvable")
    if registration.get('payment_status') == 'completed':
        raise HTTPException(status_code=400, detail="Deja paye")
    base_price = registration.get('base_price', registration.get('amount_paid', 0))
    if promo_code:
        promo = await db.promo_codes.find_one({"code": promo_code.upper()}, {"_id": 0})
        if promo:
            if promo['discount_type'] == 'percentage':
                base_price = base_price * (1 - promo['discount_value'] / 100)
            else:
                base_price = max(0, base_price - promo['discount_value'])
            await db.promo_codes.update_one({"code": promo_code.upper()}, {"$inc": {"current_uses": 1}})
    base_price = round(base_price, 2)
    service_fee = round(base_price * PLATFORM_COMMISSION, 2)
    total_to_pay = round(base_price + service_fee, 2)
    amount_cents = int(total_to_pay * 100)
    if not SQUARE_ACCESS_TOKEN:
        raise HTTPException(status_code=500, detail="Paiement non configure")
    try:
        from square.environment import SquareEnvironment
        env = SquareEnvironment.PRODUCTION if SQUARE_ENVIRONMENT == 'production' else SquareEnvironment.SANDBOX
        client = SquareClient(token=SQUARE_ACCESS_TOKEN, environment=env)
        payment_body = {
            "source_id": source_id, "idempotency_key": idempotency_key,
            "amount_money": {"amount": amount_cents, "currency": "EUR"},
            "location_id": SQUARE_LOCATION_ID, "autocomplete": True,
            "note": f"SportLyo - {registration.get('event_id', '')} - Dossard {registration.get('bib_number', '')}"
        }
        result = client.payments.create(body=payment_body)
        if hasattr(result, 'payment') and result.payment:
            sq_payment = result.payment
            sq_id = sq_payment.id if hasattr(sq_payment, 'id') else str(sq_payment)
            await db.registrations.update_one(
                {"registration_id": registration_id},
                {"$set": {"payment_status": "completed", "payment_id": sq_id, "base_price": base_price,
                          "service_fee": service_fee, "amount_paid": total_to_pay,
                          "platform_net": service_fee, "organizer_amount": base_price, "payment_provider": "square"}}
            )
            await db.payment_transactions.insert_one({
                "transaction_id": f"txn_{uuid.uuid4().hex[:12]}", "square_payment_id": sq_id,
                "registration_id": registration_id, "user_id": current_user['user_id'],
                "event_id": registration.get('event_id'), "base_price": base_price,
                "service_fee": service_fee, "amount": total_to_pay, "currency": "eur",
                "platform_net": service_fee, "organizer_amount": base_price,
                "payment_status": "completed", "payment_provider": "square",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            return {"success": True, "payment_id": sq_id, "amount": total_to_pay}
        elif hasattr(result, 'errors') and result.errors:
            err = result.errors[0]
            detail = err.detail if hasattr(err, 'detail') else str(err)
            raise HTTPException(status_code=400, detail=f"Paiement refuse: {detail}")
        else:
            raise HTTPException(status_code=400, detail="Paiement echoue")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Square payment error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur paiement: {str(e)}")


@router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    api_key = STRIPE_API_KEY or os.environ.get('STRIPE_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Payment not configured")
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        if status.payment_status == 'paid':
            await db.registrations.update_one({"checkout_session_id": session_id}, {"$set": {"payment_status": "completed"}})
            await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"payment_status": "completed"}})
        return {"status": status.status, "payment_status": status.payment_status, "amount": status.amount_total / 100, "currency": status.currency}
    except Exception as e:
        logger.error(f"Payment status error: {e}")
        raise HTTPException(status_code=500, detail="Error checking payment status")


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    api_key = STRIPE_API_KEY or os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
        if event.payment_status == 'paid':
            await db.registrations.update_one({"checkout_session_id": event.session_id}, {"$set": {"payment_status": "completed", "payment_id": event.event_id}})
            await db.payment_transactions.update_one({"session_id": event.session_id}, {"$set": {"payment_status": "completed"}})
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": False, "error": str(e)}


@router.post("/payments/refund")
async def request_refund(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    registration_id = data.get('registration_id')
    reason = data.get('reason', '')
    registration = await db.registrations.find_one({"registration_id": registration_id}, {"_id": 0})
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration['user_id'] != current_user['user_id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    if registration['payment_status'] != 'completed':
        raise HTTPException(status_code=400, detail="Payment not completed")
    refund_id = f"ref_{uuid.uuid4().hex[:12]}"
    await db.refund_requests.insert_one({
        "refund_id": refund_id, "registration_id": registration_id,
        "user_id": registration['user_id'], "amount": registration['amount_paid'],
        "reason": reason, "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Demande de remboursement creee", "refund_id": refund_id}


# ============== EXPORT HELPERS ==============

async def _get_completed_payments(start_date=None, end_date=None, event_ids=None):
    query = {"payment_status": "completed"}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        query.setdefault("created_at", {})["$lte"] = end_date + "T23:59:59"
    if event_ids:
        query["event_id"] = {"$in": event_ids}
    payments = await db.payment_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    for p in payments:
        reg = await db.registrations.find_one({"registration_id": p.get("registration_id")}, {"_id": 0})
        if reg:
            p["user_name"] = reg.get("user_name", "")
            p["user_email"] = reg.get("user_email", "")
            p["selected_race"] = reg.get("selected_race", "")
        event = await db.events.find_one({"event_id": p.get("event_id")}, {"_id": 0, "title": 1, "organizer_name": 1, "organizer_id": 1})
        if event:
            p["event_title"] = event.get("title", "")
            p["organizer_name"] = event.get("organizer_name", "")
            p["organizer_id"] = event.get("organizer_id", "")
    return payments


def _generate_csv_export(payments, title):
    text_output = StringIO()
    writer = csv.writer(text_output, delimiter=';')
    writer.writerow([title])
    writer.writerow([f"Genere le {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC"])
    writer.writerow([])
    writer.writerow(["Participant", "Email", "Evenement", "Course", "Prix base (EUR)", "Frais service 5% (EUR)", "Total paye (EUR)", "Frais Stripe (EUR)", "Organisateur (EUR)", "Net plateforme (EUR)", "Statut", "Date"])
    total_base = total_fee = total_paid = total_stripe = total_org = total_net = 0
    for p in payments:
        base = p.get('base_price', p.get('organizer_amount', 0))
        fee = p.get('service_fee', 0)
        paid = p.get('amount', 0)
        stripe = p.get('stripe_fee', 0)
        org = p.get('organizer_amount', base)
        net = p.get('platform_net', 0)
        total_base += base; total_fee += fee; total_paid += paid; total_stripe += stripe; total_org += org; total_net += net
        date_str = ""
        if p.get("created_at"):
            try:
                dt = datetime.fromisoformat(p["created_at"].replace("Z", "+00:00"))
                date_str = dt.strftime("%d/%m/%Y %H:%M")
            except:
                date_str = p["created_at"][:16]
        writer.writerow([p.get("user_name", ""), p.get("user_email", ""), p.get("event_title", ""), p.get("selected_race", "-"),
                         f"{base:.2f}", f"{fee:.2f}", f"{paid:.2f}", f"{stripe:.2f}", f"{org:.2f}", f"{net:.2f}", "Paye", date_str])
    writer.writerow([])
    writer.writerow(["TOTAL", "", "", "", f"{total_base:.2f}", f"{total_fee:.2f}", f"{total_paid:.2f}", f"{total_stripe:.2f}", f"{total_org:.2f}", f"{total_net:.2f}", f"{len(payments)} paiement(s)", ""])
    output = BytesIO()
    output.write(text_output.getvalue().encode('utf-8-sig'))
    output.seek(0)
    return output


def _generate_pdf_export(payments, title, subtitle=""):
    from fpdf import FPDF
    class PDF(FPDF):
        def header(self):
            self.set_font('Helvetica', 'B', 14)
            self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT", align='C')
            if subtitle:
                self.set_font('Helvetica', '', 9)
                self.cell(0, 5, subtitle, new_x="LMARGIN", new_y="NEXT", align='C')
            self.set_font('Helvetica', '', 8)
            self.cell(0, 5, f"Genere le {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC", new_x="LMARGIN", new_y="NEXT", align='C')
            self.ln(4)
        def footer(self):
            self.set_y(-15)
            self.set_font('Helvetica', 'I', 8)
            self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')
    pdf = PDF(orientation='L', format='A4')
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.alias_nb_pages()
    pdf.add_page()
    cols = [35, 45, 20, 22, 22, 22, 22, 22, 22, 18, 27]
    headers = ["Participant", "Evenement", "Course", "Prix base", "Frais 5%", "Total paye", "Frais Stripe", "Organisateur", "Net platef.", "Statut", "Date"]
    pdf.set_font('Helvetica', 'B', 7)
    pdf.set_fill_color(44, 52, 64)
    pdf.set_text_color(255, 255, 255)
    for i, h in enumerate(headers):
        pdf.cell(cols[i], 7, h, border=1, fill=True, align='C')
    pdf.ln()
    pdf.set_text_color(0, 0, 0)
    pdf.set_font('Helvetica', '', 7)
    total_base = total_fee = total_paid = total_stripe = total_org = total_net = 0
    for idx, p in enumerate(payments):
        base = p.get('base_price', p.get('organizer_amount', 0))
        fee = p.get('service_fee', 0)
        paid = p.get('amount', 0)
        stripe = p.get('stripe_fee', 0)
        org = p.get('organizer_amount', base)
        net = p.get('platform_net', 0)
        total_base += base; total_fee += fee; total_paid += paid; total_stripe += stripe; total_org += org; total_net += net
        date_str = ""
        if p.get("created_at"):
            try:
                dt = datetime.fromisoformat(p["created_at"].replace("Z", "+00:00"))
                date_str = dt.strftime("%d/%m/%Y")
            except:
                date_str = ""
        bg = idx % 2 == 0
        if bg:
            pdf.set_fill_color(245, 245, 245)
        pdf.cell(cols[0], 6, (p.get("user_name", "") or "")[:18], border=1, fill=bg)
        pdf.cell(cols[1], 6, (p.get("event_title", "") or "")[:22], border=1, fill=bg)
        pdf.cell(cols[2], 6, (p.get("selected_race", "") or "-")[:12], border=1, fill=bg, align='C')
        pdf.cell(cols[3], 6, f"{base:.2f}", border=1, fill=bg, align='R')
        pdf.cell(cols[4], 6, f"+{fee:.2f}", border=1, fill=bg, align='R')
        pdf.cell(cols[5], 6, f"{paid:.2f}", border=1, fill=bg, align='R')
        pdf.cell(cols[6], 6, f"-{stripe:.2f}", border=1, fill=bg, align='R')
        pdf.cell(cols[7], 6, f"{org:.2f}", border=1, fill=bg, align='R')
        pdf.cell(cols[8], 6, f"{net:.2f}", border=1, fill=bg, align='R')
        pdf.cell(cols[9], 6, "Paye", border=1, fill=bg, align='C')
        pdf.cell(cols[10], 6, date_str, border=1, fill=bg, align='C')
        pdf.ln()
    pdf.set_font('Helvetica', 'B', 7)
    pdf.set_fill_color(44, 52, 64)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(cols[0]+cols[1]+cols[2], 7, f"TOTAL ({len(payments)} paiements)", border=1, fill=True)
    pdf.cell(cols[3], 7, f"{total_base:.2f}", border=1, fill=True, align='R')
    pdf.cell(cols[4], 7, f"+{total_fee:.2f}", border=1, fill=True, align='R')
    pdf.cell(cols[5], 7, f"{total_paid:.2f}", border=1, fill=True, align='R')
    pdf.cell(cols[6], 7, f"-{total_stripe:.2f}", border=1, fill=True, align='R')
    pdf.cell(cols[7], 7, f"{total_org:.2f}", border=1, fill=True, align='R')
    pdf.cell(cols[8], 7, f"{total_net:.2f}", border=1, fill=True, align='R')
    pdf.cell(cols[9]+cols[10], 7, "", border=1, fill=True)
    pdf.ln()
    output = BytesIO()
    output.write(pdf.output())
    output.seek(0)
    return output


@router.get("/admin/payments/export")
async def export_admin_payments(format: str = Query("csv", regex="^(csv|pdf)$"), start_date: str = Query(None), end_date: str = Query(None), event_id: str = Query(None), current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    event_ids = [event_id] if event_id else None
    payments = await _get_completed_payments(start_date, end_date, event_ids)
    period = ""
    if start_date and end_date: period = f" du {start_date} au {end_date}"
    elif start_date: period = f" depuis {start_date}"
    elif end_date: period = f" jusqu'au {end_date}"
    event_name = ""
    if event_id:
        evt = await db.events.find_one({"event_id": event_id}, {"_id": 0, "title": 1})
        event_name = f" - {evt['title']}" if evt else ""
    title = f"SportLyo - Bilan financier{event_name}{period}"
    filename = f"bilan_financier{'_' + event_id if event_id else ''}_{datetime.now().strftime('%Y%m%d')}"
    if format == "csv":
        output = _generate_csv_export(payments, title)
        return StreamingResponse(output, media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'})
    else:
        output = _generate_pdf_export(payments, title)
        return StreamingResponse(output, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'})


@router.get("/organizer/payments/export")
async def export_organizer_payments(format: str = Query("csv", regex="^(csv|pdf)$"), start_date: str = Query(None), end_date: str = Query(None), event_id: str = Query(None), current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organizer only")
    if event_id:
        event_ids = [event_id]
        evt = await db.events.find_one({"event_id": event_id}, {"_id": 0, "title": 1})
        event_name = evt['title'] if evt else event_id
    else:
        org_events = await db.events.find({"organizer_id": current_user['user_id']}, {"_id": 0, "event_id": 1}).to_list(1000)
        event_ids = [e['event_id'] for e in org_events]
        event_name = None
    if not event_ids:
        raise HTTPException(status_code=404, detail="Aucun evenement trouve")
    payments = await _get_completed_payments(start_date, end_date, event_ids)
    period = ""
    if start_date and end_date: period = f" du {start_date} au {end_date}"
    evt_label = f" - {event_name}" if event_name else ""
    title = f"Releve de paiements - {current_user.get('name', 'Organisateur')}{evt_label}{period}"
    filename = f"releve_organisateur{'_' + event_id if event_id else ''}_{datetime.now().strftime('%Y%m%d')}"
    if format == "csv":
        output = _generate_csv_export(payments, title)
        return StreamingResponse(output, media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'})
    else:
        output = _generate_pdf_export(payments, title, subtitle=f"Organisateur: {current_user.get('name', '')}")
        return StreamingResponse(output, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'})
