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
    amount = float(data.get("amount", 0))
    description = data.get("description", "Paiement SportLyo")
    if not source_id or amount <= 0:
        raise HTTPException(status_code=400, detail="source_id et amount requis")
    amount_cents = int(amount * 100)
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
                    "line_items": [{"name": description, "quantity": "1", "base_price_money": {"amount": amount_cents, "currency": "EUR"}}]
                },
                "checkout_options": {"allow_tipping": False, "redirect_url": f"{os.environ.get('FRONTEND_URL', '')}/organizer?payment=success&ref={source_id}"}
            })
            if hasattr(result, 'payment_link') and result.payment_link:
                payment_url = result.payment_link.url if hasattr(result.payment_link, 'url') else str(result.payment_link.long_url if hasattr(result.payment_link, 'long_url') else '')
        except Exception as e:
            logger.warning(f"Square payment link error: {e}")
    if not payment_url:
        payment_url = f"https://checkout.square.site/simulated/{link_id}?amount={amount}&desc={description}"
    link_record = {
        "link_id": link_id, "type": link_type, "source_id": source_id,
        "organizer_id": current_user['user_id'], "amount": amount,
        "description": description, "payment_url": payment_url,
        "payment_status": "pending", "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_links.insert_one(link_record)
    if link_type == "sponsor":
        await db.sponsors.update_one({"sponsor_id": source_id}, {"$set": {"payment_link": payment_url, "payment_status": "pending"}})
    elif link_type == "booking":
        await db.corporate_bookings.update_one({"booking_id": source_id}, {"$set": {"payment_link": payment_url, "payment_status": "pending"}})
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}", "type": link_type,
        "source_id": source_id, "organizer_id": current_user['user_id'],
        "amount": amount, "description": description, "payment_url": payment_url,
        "payment_status": "pending", "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"payment_url": payment_url, "link_id": link_id}


# ============== SQUARE PAYMENT ==============

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
