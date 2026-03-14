# SportLyo - PRD (Product Requirements Document)

## Probleme Original
Plateforme de vente de tickets en ligne pour des evenements sportifs (marathon, trail, velo, etc.), nommee SportLyo.

## Architecture
- **Frontend:** React, TailwindCSS, Shadcn UI, framer-motion, recharts, date-fns
- **Backend:** FastAPI avec routeurs modulaires
- **Database:** MongoDB
- **Auth:** JWT
- **Paiements:** Square, SumUp
- **PDF:** fpdf2
- **SMS:** Twilio (graceful degradation)
- **Scraping:** BeautifulSoup4, Playwright

## Credentials de test
| Role | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Prestataire | boutique@sportlyo.fr | boutique123 |

## Ce qui est implemente

### Mars 2026 - Session 11 (Validation Refactorisation)

**Refactorisation OrganizerDashboard COMPLETE et VALIDEE:**
- Fichier monolithique ~2800 lignes decompose en 16 sous-composants modulaires
- OrganizerDashboard.js reduit a ~955 lignes (orchestrateur)
- Tous les composants connectes et fonctionnels (HubSection, EventsSection, ParticipantsSection, GaugesSection, CheckinSection, FinancesSection, BoutiqueSection, CorrespondancesSection, ShareSection, ChronometrageSection, ResultsSection, PartnersSection, SponsorsSection, BookingsSection)
- 2 bugs corriges: import manquant BoutiqueSection, SectionHeader manquant BookingsSection
- Testing agent: 100% pass rate sur les 16 sections

### Mars 2026 - Session 10 (P1 Refactorisation)

**Refactorisation ProviderDashboard:**
- 1191 -> 891 lignes (-25%)
- Composants extraits: ProviderCatalogue, ProviderFinances, ProviderSales, ProviderMessages
- Repertoire: `components/provider/`

### Mars 2026 - Session 9 (P2 Features)
- Facturation avancee (PDF)
- Gestion communautaire
- Demandes de remboursement
- Location materiel RFID
- Check-in mobile
- Statistiques avancees organisateurs
- Notifications SMS (Twilio - mode queue)

### Mars 2026 - Session 8
- Phase C : Commission Admin 1EUR/produit
- Bug fix : Images XD Connects

### Sessions precedentes (6-7)
- Phase A & B (evenements, participant)
- Import XDConnects/Playwright
- Ameliorations homepage

## Backlog Priorise

### P1 -- Refactorisation -- COMPLETE
- [x] Extraire ProviderCatalogue, ProviderFinances, ProviderSales, ProviderMessages
- [x] Extraire OrganizerAnalyticsSection, OrganizerSmsSection
- [x] Connecter tous les composants (HubSection, EventsSection, ParticipantsSection, GaugesSection, CheckinSection, FinancesSection, BoutiqueSection, CorrespondancesSection, ShareSection, ChronometrageSection, ResultsSection, PartnersSection, SponsorsSection, BookingsSection)
- [x] Reduire OrganizerDashboard.js sous 1000 lignes (955 lignes actuellement)

### P3 -- Finaliser 7 fonctionnalites ebauchees
- [ ] Facturation avancee : Ameliorer les PDF de factures (branding, plus de details)
- [ ] Gestion communautaire : Polir l'interface du fil d'actualite, ajouter la pagination
- [ ] Demandes de remboursement : Ameliorer l'UI et ajouter des notifications
- [ ] Location materiel RFID : Interface de gestion de stock organisateurs et location participants
- [ ] Application de check-in : Interface fonctionnelle pour le jour de l'evenement
- [ ] Statistiques avancees : Ajouter des filtres (par date) et plus de graphiques
- [ ] Notifications SMS (Twilio) : Configuration cles API et activation

### Backlog
- [ ] Ameliorer l'onglet Commissions admin avec graphiques visuels
- [ ] Refactorisation de ProviderDashboard.js (peut encore etre decompose)
- [ ] Configurer cles Twilio pour envoi reel de SMS
- [ ] Gestion admin RFID (ajout/modification equipements)
- [ ] Export CSV des statistiques organisateur
- [ ] Paiement en ligne pour les locations RFID

## Code Architecture
```
/app/frontend/src/components/
|-- organizer/
|   |-- OrganizerAnalyticsSection.js  # EXTRACTED + CONNECTED
|   |-- OrganizerSmsSection.js        # EXTRACTED + CONNECTED
|   |-- HubSection.js                 # CONNECTED
|   |-- EventsSection.js              # CONNECTED
|   |-- ParticipantsSection.js        # CONNECTED
|   |-- GaugesSection.js              # CONNECTED
|   |-- CheckinSection.js             # CONNECTED
|   |-- FinancesSection.js            # CONNECTED
|   |-- BoutiqueSection.js            # CONNECTED
|   |-- CorrespondancesSection.js     # CONNECTED
|   |-- ShareSection.js               # CONNECTED
|   |-- ChronometrageSection.js       # CONNECTED
|   |-- ResultsSection.js             # CONNECTED
|   |-- PartnersSection.js            # CONNECTED
|   |-- SponsorsSection.js            # CONNECTED
|   |-- BookingsSection.js            # CONNECTED
|   |-- index.js                      # Barrel exports
|-- provider/
|   |-- ProviderCatalogue.js          # EXTRACTED
|   |-- ProviderFinances.js           # EXTRACTED
|   |-- ProviderSales.js              # EXTRACTED
|   |-- ProviderMessages.js           # EXTRACTED
|-- EventCommunity.js                 # Community component

/app/backend/routers/
|-- admin.py, analytics.py, checkin.py, community.py
|-- events.py, invoices.py, notifications.py, organizer.py
|-- provider.py, provider_products.py, refunds.py, rfid.py
|-- selections.py, shop.py, sms.py
|-- toptex_importer.py, uploads.py, users.py
|-- xdconnects_import.py
```
