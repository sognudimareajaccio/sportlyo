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

    pdf_bytes = generate_invoice_pdf(invoice)
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


def generate_invoice_pdf(invoice: dict) -> bytes:
    from fpdf import FPDF

    class InvoicePDF(FPDF):
        def header(self):
            self.set_font('Helvetica', 'B', 22)
            self.set_text_color(30, 30, 30)
            self.cell(0, 12, 'SportLyo', ln=True)
            self.set_font('Helvetica', '', 9)
            self.set_text_color(120, 120, 120)
            self.cell(0, 5, 'Plateforme d\'evenements sportifs', ln=True)
            self.cell(0, 5, 'contact@sportlyo.fr | www.sportlyo.fr', ln=True)
            self.ln(8)
            # Orange line
            self.set_draw_color(255, 69, 0)
            self.set_line_width(1)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(8)

        def footer(self):
            self.set_y(-20)
            self.set_draw_color(200, 200, 200)
            self.set_line_width(0.3)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(3)
            self.set_font('Helvetica', '', 7)
            self.set_text_color(150, 150, 150)
            self.cell(0, 4, 'SportLyo SAS - SIRET 000 000 000 00000 - TVA FR00000000000', align='C', ln=True)
            self.cell(0, 4, f'Page {self.page_no()}/{{nb}}', align='C')

    pdf = InvoicePDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=25)

    # Invoice title + number
    pdf.set_font('Helvetica', 'B', 16)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 10, f'FACTURE {invoice.get("invoice_number", "")}', ln=True)
    pdf.ln(2)

    # Status badge
    status = invoice.get("status", "paid")
    if status == "paid":
        pdf.set_fill_color(220, 252, 231)
        pdf.set_text_color(22, 101, 52)
        pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(25, 7, ' PAYEE ', fill=True, ln=True)
    else:
        pdf.set_fill_color(254, 249, 195)
        pdf.set_text_color(133, 100, 4)
        pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(35, 7, ' EN ATTENTE ', fill=True, ln=True)
    pdf.ln(6)

    # Two-column: Client info | Invoice details
    pdf.set_text_color(30, 30, 30)
    y_start = pdf.get_y()

    # Left: Client
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(95, 5, 'FACTURE A', ln=True)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(95, 6, invoice.get("user_name", "Client"), ln=True)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(80, 80, 80)
    if invoice.get("user_email"):
        pdf.cell(95, 5, invoice["user_email"], ln=True)
    if invoice.get("shipping_address"):
        pdf.cell(95, 5, invoice["shipping_address"], ln=True)

    # Right: Invoice meta
    pdf.set_y(y_start)
    pdf.set_x(110)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(120, 120, 120)

    meta_items = [
        ("Date d'emission", _format_date(invoice.get("created_at", ""))),
        ("Date de paiement", _format_date(invoice.get("payment_date", ""))),
        ("Type", "Inscription" if invoice.get("source_type") == "registration" else "Commande boutique"),
    ]
    if invoice.get("event_title"):
        meta_items.append(("Evenement", invoice["event_title"][:40]))
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

    pdf.ln(10)

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
    x_value = 165
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

    # Total line
    pdf.ln(2)
    pdf.set_draw_color(255, 69, 0)
    pdf.set_line_width(0.5)
    pdf.line(x_label, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    pdf.set_x(x_label)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(255, 69, 0)
    pdf.cell(w_label, 8, 'TOTAL', align='R')
    pdf.cell(w_value, 8, f'{invoice.get("total", 0):.2f} EUR  ', align='R', ln=True)

    pdf.ln(12)

    # Payment info
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 4, 'Merci pour votre confiance. Cette facture a ete generee automatiquement par la plateforme SportLyo.', ln=True)

    return pdf.output()


def _format_date(date_str: str) -> str:
    if not date_str:
        return "—"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return date_str[:10] if len(date_str) >= 10 else date_str
