# SportLyo - Product Requirements Document

## Original Problem Statement
Plateforme de vente de tickets en ligne pour réserver des événements sportifs (marathons, trails, courses cyclistes, etc.). Nommée **SportLyo**.

---

## Architecture
- **Backend:** FastAPI (Python) | **Frontend:** React 19 + Tailwind + Shadcn/UI | **DB:** MongoDB
- **Auth:** JWT + Google OAuth | **Payments:** Stripe (5% commission) | **PDF:** fpdf2

---

## What's Been Implemented

### Core
- [x] Landing page, catalogue événements, page détail, auth, dashboards (participant/organisateur/admin)

### Inscriptions & Paiements
- [x] Inscriptions avancées (quotas, tarifs, vagues, options, restrictions d'âge, équipes)
- [x] Formulaire inscription avec prénom, nom, sexe, date de naissance, **affichage âge calculé**
- [x] Paiements Stripe (5% commission ajoutée, codes promo)
- [x] Dossards, RFID simulé, QR Code, check-in

### PPS (Pass Prévention Santé) — March 12, 2026
- [x] Lien vers https://pps.athle.fr/?locale=fr dans la page événement et le formulaire
- [x] Upload PPS (PDF/image) par le participant dans son espace
- [x] Réception et vérification/rejet PPS par l'organisateur (boutons approuver/rejeter)
- [x] Statut PPS visible : en attente / vérifié / rejeté
- [x] Âge stocké dans l'inscription et affiché dans le tableau organisateur

### Dashboard Organisateur
- [x] Page gestion événement (/organizer/event/:eventId) — stats, jauge, inscrits en temps réel
- [x] Ajout manuel de participants, gestion codes promo (CRUD)
- [x] Partage réseaux sociaux (Facebook, Twitter/X, WhatsApp, LinkedIn, copie lien)
- [x] Contact admin (demande remboursement/question technique)
- [x] Colonnes Âge et PPS dans la table des inscrits

### Chronométrage
- [x] API RFID (/api/rfid-read), résultats live, classements par catégorie
- [x] Page Check-in, export CSV chronométrage
- [x] Documentation intégration (RaceResult, Chronotrack, MyLaps, Webscorer)

### Exports & Communication
- [x] CSV/PDF financiers (admin + organisateur), CSV chronométrage
- [x] Page Coming Soon avec accès privé (SPORTLYO2026)
- [x] Logos SportLyo officiels

---

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organizer | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Participant | sophie@test.com | test1234 |

---

## Prioritized Backlog

### P1 - Communication & Facturation
- [ ] Emails automatiques Resend (confirmation inscription + QR code)
- [ ] Factures automatiques PDF pour participants/groupes
- [ ] Notifications SMS Twilio

### P1.5 - Chronométrage avancé
- [ ] Configuration UI webhook pour logiciels chrono
- [ ] Import CSV de temps, location RFID

### P2 - Communauté & Avancé
- [ ] Communauté par organisation, validation arrivées live
- [ ] Gestion catégories personnalisables, vérification PPS réelle API FFA
- [ ] Refactoring backend (server.py → modules)

### P3 - Nice to Have
- [ ] Carte parcours, app mobile check-in, multi-langue, stats avancées

---

## Notes Techniques
- **PPS:** Upload réel (PDF/image), vérification manuelle par organisateur. Numéro PPS auto-validé (MOCKED)
- **RFID:** Endpoint simulé (MOCKED)
- **Accès:** ?preview=SPORTLYO2026
- **Logos:** logo-dark.png (fond clair), logo-light.png (fond sombre)
