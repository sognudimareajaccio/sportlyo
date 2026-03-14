# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour des événements sportifs (marathon, trail, vélo, etc.), nommée SportLyo.

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
| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Prestataire | boutique@sportlyo.fr | boutique123 |

## Ce qui est implémenté

### Mars 2026 - Session 10 (P1 Refactorisation)

**Refactorisation ProviderDashboard ✅:**
- 1191 → 891 lignes (-25%)
- Composants extraits: ProviderCatalogue, ProviderFinances, ProviderSales, ProviderMessages
- Répertoire: `components/provider/`

**Refactorisation OrganizerDashboard (partielle) ✅:**
- 3019 → 2867 lignes (-5%)
- Composants extraits: OrganizerAnalyticsSection, OrganizerSmsSection
- Répertoire: `components/organizer/`
- Note: Des composants pré-existants (HubSection, EventsSection, etc.) existent dans le dossier mais ne sont pas connectés. Intégration à faire en session suivante.

### Mars 2026 - Session 9 (P2 Features)
- Facturation avancée (PDF) ✅
- Gestion communautaire ✅
- Demandes de remboursement ✅
- Location matériel RFID ✅
- Check-in mobile ✅
- Statistiques avancées organisateurs ✅
- Notifications SMS (Twilio - mode queue) ✅

### Mars 2026 - Session 8
- Phase C : Commission Admin 1€/produit ✅
- Bug fix : Images XD Connects ✅

### Sessions précédentes (6-7)
- Phase A & B (événements, participant) ✅
- Import XDConnects/Playwright ✅
- Améliorations homepage ✅

## Backlog Priorisé

### P1 — Refactorisation (en cours)
- [x] Extraire ProviderCatalogue, ProviderFinances, ProviderSales, ProviderMessages
- [x] Extraire OrganizerAnalyticsSection, OrganizerSmsSection
- [ ] Connecter les composants pré-existants (HubSection, EventsSection, ParticipantsSection, GaugesSection, CheckinSection, FinancesSection, BoutiqueSection)
- [ ] Réduire OrganizerDashboard.js sous 1500 lignes

### P3 — Futur
- [ ] Configurer clés Twilio pour envoi réel de SMS
- [ ] Gestion admin RFID (ajout/modification équipements)
- [ ] Export CSV des statistiques organisateur
- [ ] Paiement en ligne pour les locations RFID
- [ ] Graphiques améliorés (recharts) dans analytics

## Code Architecture
```
/app/frontend/src/components/
├── organizer/
│   ├── OrganizerAnalyticsSection.js  # EXTRACTED
│   ├── OrganizerSmsSection.js        # EXTRACTED
│   ├── HubSection.js                 # Pre-existing, NOT CONNECTED
│   ├── EventsSection.js              # Pre-existing, NOT CONNECTED
│   ├── ParticipantsSection.js        # Pre-existing, NOT CONNECTED
│   ├── GaugesSection.js              # Pre-existing, NOT CONNECTED
│   ├── CheckinSection.js             # Pre-existing, NOT CONNECTED
│   ├── FinancesSection.js            # Pre-existing, NOT CONNECTED
│   ├── BoutiqueSection.js            # Pre-existing, NOT CONNECTED
│   └── index.js
├── provider/
│   ├── ProviderCatalogue.js          # EXTRACTED
│   ├── ProviderFinances.js           # EXTRACTED
│   ├── ProviderSales.js              # EXTRACTED
│   └── ProviderMessages.js           # EXTRACTED
└── EventCommunity.js                 # Community component

/app/backend/routers/
├── admin.py, analytics.py, checkin.py, community.py
├── events.py, invoices.py, notifications.py, organizer.py
├── provider.py, provider_products.py, refunds.py, rfid.py
├── selections.py, shop.py, sms.py
├── toptex_importer.py, uploads.py, users.py
└── xdconnects_import.py
```
