# SportsConnect - Product Requirements Document

## Original Problem Statement
Plateforme de vente de tickets en ligne pour réserver des événements sportifs (marathons, trails, courses cyclistes, etc.) avec les thématiques: Cyclisme, Triathlon, Course à pied, Marche, Sports Mécaniques. 

**Fonctionnalités clés demandées:**
- Inscriptions avancées (quotas, tarifs évolutifs, équipes/relais, vagues)
- Gestion participants (validation documents, PPS, dossards)
- Paiements sécurisés (Stripe Connect, 6% commission, codes promo, remboursements)
- Communication (emails, billets digitaux, QR code)
- Chronométrage manuel pour participants
- Back-office admin complet

**Inspiration:** https://new.sportsnconnect.com/

---

## Architecture

### Tech Stack
- **Backend:** FastAPI (Python)
- **Frontend:** React 19 + Tailwind CSS + Shadcn/UI
- **Database:** MongoDB
- **Authentication:** JWT + Emergent Google OAuth
- **AI:** OpenAI GPT-5.2 via Emergent LLM Key
- **Payments:** Stripe Connect (6% commission)
- **QR Code:** qrcode library

### API Structure (v2.0)
```
AUTH
/api/auth/register, /login, /me, /session, /logout, /profile, /role

EVENTS
/api/events (CRUD with races, waves, options, pricing tiers)
/api/events/featured, /events/{id}
/api/organizer/events, /organizer/registrations/{event_id}

REGISTRATIONS
/api/registrations (with race/wave/options selection, PPS)
/api/registrations/{id}/ticket (digital ticket with QR)
/api/registrations/{id}/transfer (bib transfer)

PPS (Pass Prévention Santé)
/api/pps/verify, /api/pps/status

TIMING (Chronometer)
/api/timing/start, /api/timing/stop
/api/timing/results/{event_id}
/api/timing/my-results

PAYMENTS (Stripe Connect)
/api/payments/create-checkout
/api/payments/status/{session_id}
/api/payments/refund
/api/webhook/stripe

PROMO CODES
/api/promo-codes (CRUD)
/api/promo-codes/validate

WAITLIST
/api/waitlist (join/check position)

TEAMS
/api/teams (create, join, get)

ADMIN
/api/admin/stats, /users, /payments, /refunds
```

---

## User Personas

1. **Participant** - Sportifs cherchant des événements, utilisant le chrono personnel
2. **Organisateur** - Clubs/associations créant événements avec options avancées
3. **Admin** - Gestionnaire plateforme, suivi commissions et utilisateurs

---

## What's Been Implemented

### Phase 1 - MVP ✅
- [x] Landing page avec hero dynamique, catégories, événements
- [x] Catalogue d'événements avec filtres
- [x] Page détail événement
- [x] Authentification JWT + Google OAuth
- [x] Dashboard participant et organisateur
- [x] Back-office admin
- [x] Chatbot IA "Coach AI"

### Phase 2 - Fonctionnalités Avancées ✅
- [x] **Inscriptions avancées:**
  - Quotas par épreuve (races)
  - Tarifs évolutifs (pricing tiers)
  - Vagues de départ
  - Options/merchandising payant
  - Restriction d'âge
  - Équipes/relais
  
- [x] **Gestion participants:**
  - Vérification PPS (Pass Prévention Santé) - MOCKED
  - Transfert de dossards
  - Liste d'attente intelligente
  - QR Code billet digital
  
- [x] **Paiements Stripe Connect:**
  - Commission 6% plateforme
  - Codes promo (% ou fixe)
  - Demandes de remboursement
  - Webhook integration
  
- [x] **Chronométrage:**
  - Chrono manuel participant (start/stop)
  - Résultats live avec auto-refresh
  - Classement par épreuve
  - Historique personnel
  
- [x] **Communication:**
  - Billet digital avec QR code
  - Check-in par scan

### Phase 2.1 - Modification d'événements ✅ (March 11, 2026)
- [x] **Modification d'événements par l'organisateur:**
  - Modale d'édition complète avec tous les champs
  - Gestion multi-épreuves/distances avec tarifs différenciés
  - Ajout/modification/suppression d'épreuves
  - Upload/modification d'image dans l'éditeur
  - Tests backend 16/16 passés (pytest)
  - Tests frontend 100% passés

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organizer | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |

---

## Prioritized Backlog

### P0 - Production Ready
- [ ] Vérification PPS réelle avec API FFA (pps.athle.fr)
- [ ] Emails transactionnels (Resend/SendGrid)
- [ ] SMS notifications (Twilio)

### P1 - High Priority
- [ ] Carte interactive des parcours (Leaflet/Mapbox)
- [ ] Export PDF liste participants
- [ ] Analyse prédictive des ventes (IA)
- [ ] Cotation ITRA simulée

### P2 - Medium Priority
- [ ] Upload/validation certificat médical
- [ ] Chronométreur officiel (intégration externe)
- [ ] Multi-langue (FR/EN)
- [ ] Assurance annulation/corporelle

### P3 - Nice to Have
- [ ] Application mobile
- [ ] Partage réseaux sociaux
- [ ] Badges/achievements
- [ ] Partenariats sponsors

---

## Notes Techniques

- **Commission:** 6% prélevé sur chaque inscription
- **PPS:** Pass Prévention Santé FFA obligatoire pour certains événements (5€/an)
- **Chronométrage:** Manuel via app mobile, possibilité d'intégrer chronométreur externe
- **Stripe Connect:** Modèle marketplace avec escrow account

---

## Changelog

### v2.3 (March 11, 2026)
- Added CSV and PDF export for financial reports
  - Admin: "Export CSV" + "Export PDF" buttons with date range filter
  - Organizer: "Relevé de paiements" section with CSV/PDF export
  - CSV: semicolon delimiter, UTF-8-BOM encoding (Excel-compatible), TOTAL footer row
  - PDF: landscape A4, fpdf2, header/footer with page numbers
  - Only completed (PAYÉ) payments exported
  - Authorization enforced: admin-only for admin exports, organizer-only for organizer exports
- 100% test pass rate (iteration 6, 16/16 backend tests)

### v2.2 (March 11, 2026)
- Changed commission model: 5% service fee ADDED on top of base price (not deducted)
  - Participant pays: base_price + 5% service fee
  - Organizer receives: 100% of base price
  - Platform net: service_fee - Stripe fees (1.4% + 0.25€)
- Admin back office: "BILAN FINANCIER AUTOMATIQUE" + "TABLEAU DE VENTILATION DES PAIEMENTS"
  - Summary: Total encaissé, Organisateurs, Commission 5%, Frais Stripe, Net plateforme
  - Detail table: Participant, Événement, Course, Prix base, Frais service, Total payé, Frais Stripe, Organisateur, Net plateforme, Statut, Date
  - Footer with auto-calculated totals
- Full E2E payment test passed: Sophie Test → 20km/35€ → 36.75€ total → Stripe → Payé ✅
- Backend and frontend tests: 100% pass rate (iteration 5)

### v2.1 (March 11, 2026)
- Finalized event editing with multi-race/distance pricing management
- Verified and validated Stripe payment flow end-to-end (registration → checkout → Stripe redirect → confirmation)
- Fixed commission rate display: 5% → 6% consistently across admin/organizer dashboards
- Fixed "À partir de" price to show minimum race price when races exist
- Added data-testid attributes for edit buttons
- Added DialogDescription for accessibility compliance
- Backend and frontend tests: 100% pass rate (iterations 3 and 4)

### v2.0 (March 2026)
- Added advanced registration system
- Added PPS verification
- Added Stripe Connect payments with 6% commission
- Added chronometer for participants
- Added live results system
- Added promo codes
- Added waitlist system
- Added team/relay registration
- Added digital tickets with QR code
