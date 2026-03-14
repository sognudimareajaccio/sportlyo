from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from deps import db, get_current_user
from datetime import datetime, timezone
import io
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvee")
    if current_user['role'] == 'participant' and invoice.get('user_id') != current_user['user_id']:
        raise HTTPException(status_code=403, detail="Acces non autorise")

    # Fetch organizer info for branding
    organizer = None
    if invoice.get("organizer_id"):
        organizer = await db.users.find_one({"user_id": invoice["organizer_id"]}, {"_id": 0, "company_name": 1, "name": 1, "email": 1, "phone": 1, "address": 1, "siret": 1, "logo_url": 1})
    # Fetch event info
    event = None
    if invoice.get("source_type") == "registration" and invoice.get("source_id"):
        reg = await db.registrations.find_one({"registration_id": invoice["source_id"]}, {"_id": 0, "event_id": 1})
        if reg:
            event = await db.events.find_one({"event_id": reg["event_id"]}, {"_id": 0, "title": 1, "date": 1, "location": 1})
    elif invoice.get("event_title"):
        event = {"title": invoice["event_title"]}

    pdf_bytes = generate_invoice_pdf(invoice, organizer=organizer, event=event)
    filename = f"facture_{invoice.get('invoice_number', invoice_id)}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/admin/invoices")
async def get_all_invoices(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    total_amount = sum(inv.get("total", 0) for inv in invoices)
    return {
        "invoices": invoices,
        "total_count": len(invoices),
        "total_amount": round(total_amount, 2)
    }


def generate_invoice_pdf(invoice: dict, organizer: dict = None, event: dict = None) -> bytes:
    from fpdf import FPDF

    org_name = (organizer or {}).get("company_name") or (organizer or {}).get("name") or ""
    org_email = (organizer or {}).get("email") or ""
    org_phone = (organizer or {}).get("phone") or ""
    org_address = (organizer or {}).get("address") or ""
    org_siret = (organizer or {}).get("siret") or ""

    class InvoicePDF(FPDF):
        def header(self):
            # Dark header band
            self.set_fill_color(30, 41, 59)
            self.rect(0, 0, 210, 38, 'F')
            # Orange accent bar
            self.set_fill_color(255, 69, 0)
            self.rect(0, 38, 210, 2, 'F')

            self.set_y(8)
            self.set_font('Helvetica', 'B', 24)
            self.set_text_color(255, 255, 255)
            self.cell(100, 12, 'FACTURE', ln=False)

            # Right side: organizer or SportLyo branding
            self.set_font('Helvetica', 'B', 11)
            self.set_x(110)
            brand = org_name if org_name else 'SportLyo'
            self.cell(90, 6, brand, align='R', ln=True)
            self.set_font('Helvetica', '', 8)
            self.set_text_color(180, 190, 210)
            if org_address:
                self.set_x(110)
                self.cell(90, 4, org_address, align='R', ln=True)
            if org_email:
                self.set_x(110)
                self.cell(90, 4, org_email, align='R', ln=True)
            if org_phone:
                self.set_x(110)
                self.cell(90, 4, org_phone, align='R', ln=True)
            if not org_name:
                self.set_x(110)
                self.cell(90, 4, 'contact@sportlyo.fr | www.sportlyo.fr', align='R', ln=True)
            self.set_y(44)

        def footer(self):
            self.set_y(-25)
            self.set_draw_color(200, 200, 200)
            self.set_line_width(0.3)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(3)
            self.set_font('Helvetica', '', 7)
            self.set_text_color(150, 150, 150)
            siret_line = f'SIRET {org_siret}' if org_siret else 'SportLyo SAS - SIRET 000 000 000 00000'
            self.cell(0, 4, f'{org_name or "SportLyo"} - {siret_line}', align='C', ln=True)
            self.cell(0, 4, f'Page {self.page_no()}/{{nb}} | Facture generee par SportLyo', align='C')

    pdf = InvoicePDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=30)

    # Invoice number + status
    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(130, 10, f'N\u00b0 {invoice.get("invoice_number", "")}')
    status = invoice.get("status", "paid")
    if status == "paid":
        pdf.set_fill_color(220, 252, 231)
        pdf.set_text_color(22, 101, 52)
        pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(60, 8, 'PAYEE', align='C', fill=True, ln=True)
    else:
        pdf.set_fill_color(254, 249, 195)
        pdf.set_text_color(133, 100, 4)
        pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(60, 8, 'EN ATTENTE', align='C', fill=True, ln=True)
    pdf.ln(6)

    # Two-column layout: Client | Invoice meta
    pdf.set_text_color(30, 30, 30)
    y_start = pdf.get_y()

    # Left: Client info box
    pdf.set_fill_color(248, 250, 252)
    pdf.rect(10, y_start, 90, 30, 'F')
    pdf.set_xy(14, y_start + 3)
    pdf.set_font('Helvetica', 'B', 8)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(80, 4, 'FACTURE A', ln=True)
    pdf.set_x(14)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(80, 6, invoice.get("user_name", "Client"), ln=True)
    pdf.set_x(14)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(80, 80, 80)
    if invoice.get("user_email"):
        pdf.cell(80, 5, invoice["user_email"], ln=True)
        pdf.set_x(14)
    if invoice.get("shipping_address"):
        pdf.cell(80, 5, invoice["shipping_address"], ln=True)

    # Right: Meta info
    pdf.set_y(y_start + 3)
    meta_items = [
        ("Date d'emission", _format_date(invoice.get("created_at", ""))),
        ("Date de paiement", _format_date(invoice.get("payment_date", ""))),
        ("Type", "Inscription" if invoice.get("source_type") == "registration" else "Commande boutique"),
    ]
    event_title = (event or {}).get("title") or invoice.get("event_title", "")
    if event_title:
        meta_items.append(("Evenement", event_title[:40]))
    event_date = (event or {}).get("date")
    if event_date:
        meta_items.append(("Date evenement", _format_date(event_date)))
    event_location = (event or {}).get("location")
    if event_location:
        meta_items.append(("Lieu", str(event_location)[:35]))
    if invoice.get("delivery_method"):
        meta_items.append(("Livraison", invoice["delivery_method"]))

    for label, value in meta_items:
        pdf.set_x(110)
        pdf.set_font('Helvetica', '', 8)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(30, 5, label)
        pdf.set_font('Helvetica', 'B', 9)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(60, 5, str(value), ln=True)

    pdf.set_y(max(pdf.get_y(), y_start + 34))
    pdf.ln(6)

    # Items table header
    pdf.set_fill_color(30, 41, 59)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Helvetica', 'B', 8)
    pdf.cell(95, 8, '  DESCRIPTION', fill=True)
    pdf.cell(25, 8, 'QTE', align='C', fill=True)
    pdf.cell(35, 8, 'PRIX UNIT.', align='R', fill=True)
    pdf.cell(35, 8, 'TOTAL  ', align='R', fill=True, ln=True)

    # Items rows
    pdf.set_text_color(30, 30, 30)
    items = invoice.get("items", [])
    for i, item in enumerate(items):
        bg = (248, 250, 252) if i % 2 == 0 else (255, 255, 255)
        pdf.set_fill_color(*bg)
        pdf.set_font('Helvetica', '', 9)
        desc = str(item.get("description", ""))[:55]
        pdf.cell(95, 7, f'  {desc}', fill=True)
        pdf.cell(25, 7, str(item.get("quantity", 1)), align='C', fill=True)
        pdf.set_font('Helvetica', '', 9)
        unit_price = item.get("unit_price", item.get("total", 0) / max(item.get("quantity", 1), 1))
        pdf.cell(35, 7, f'{unit_price:.2f} EUR', align='R', fill=True)
        pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(35, 7, f'{item.get("total", 0):.2f} EUR  ', align='R', fill=True, ln=True)

    pdf.ln(4)

    # Totals
    x_label = 130
    w_label = 35
    w_value = 35

    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(80, 80, 80)
    pdf.set_x(x_label)
    pdf.cell(w_label, 6, 'Sous-total', align='R')
    pdf.cell(w_value, 6, f'{invoice.get("subtotal", invoice.get("total", 0)):.2f} EUR  ', align='R', ln=True)

    if invoice.get("delivery_fee", 0) > 0:
        pdf.set_x(x_label)
        pdf.cell(w_label, 6, 'Livraison', align='R')
        pdf.cell(w_value, 6, f'{invoice["delivery_fee"]:.2f} EUR  ', align='R', ln=True)

    if invoice.get("tax_amount", 0) > 0:
        pdf.set_x(x_label)
        pdf.cell(w_label, 6, f'TVA ({invoice.get("tax_rate", 0)}%)', align='R')
        pdf.cell(w_value, 6, f'{invoice["tax_amount"]:.2f} EUR  ', align='R', ln=True)

    # Total line with orange accent
    pdf.ln(2)
    pdf.set_fill_color(255, 69, 0)
    pdf.rect(x_label, pdf.get_y(), 70, 0.8, 'F')
    pdf.ln(4)
    pdf.set_x(x_label)
    pdf.set_font('Helvetica', 'B', 13)
    pdf.set_text_color(255, 69, 0)
    pdf.cell(w_label, 8, 'TOTAL', align='R')
    pdf.cell(w_value, 8, f'{invoice.get("total", 0):.2f} EUR  ', align='R', ln=True)

    pdf.ln(10)

    # Payment reference box
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(220, 220, 220)
    y_box = pdf.get_y()
    pdf.rect(10, y_box, 190, 18, 'DF')
    pdf.set_xy(14, y_box + 2)
    pdf.set_font('Helvetica', 'B', 8)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 4, 'INFORMATIONS DE PAIEMENT', ln=True)
    pdf.set_x(14)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(80, 80, 80)
    ref = invoice.get("invoice_number", invoice.get("invoice_id", ""))
    method = invoice.get("delivery_method", "Plateforme SportLyo")
    pdf.cell(0, 4, f'Reference: {ref}  |  Methode: {method}  |  Statut: {"Paye" if status == "paid" else "En attente"}', ln=True)
    pdf.set_x(14)
    pdf.cell(0, 4, f'Emise via SportLyo - Plateforme d\'evenements sportifs', ln=True)

    pdf.ln(8)

    # Thank you
    pdf.set_font('Helvetica', 'I', 9)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 4, 'Merci pour votre confiance. Cette facture a ete generee automatiquement par la plateforme SportLyo.', ln=True)
    if org_name:
        pdf.cell(0, 4, f'Organisateur: {org_name}', ln=True)

    return pdf.output()


def _format_date(date_str: str) -> str:
    if not date_str:
        return "—"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return date_str[:10] if len(date_str) >= 10 else date_str
