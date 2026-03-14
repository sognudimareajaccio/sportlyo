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

### Mars 2026 - Session 12 (P3 - Finalisation 7 fonctionnalites)

**4 features prioritaires (batch 1) — COMPLETE et TESTEES:**
- Facturation avancee : PDF avec branding organisateur (company name, SIRET, address), infos evenement, statut colore, boite infos paiement
- RFID Admin : Onglet RFID dans admin dashboard avec CRUD equipements, stats (5 KPIs), gestion demandes de location (confirmer/refuser/retourner)
- Check-in Jour J : Page /checkin avec selection evenement, barre de progression animee, scan rapide dossard, annulation check-in, liste participants
- SMS Templates : 6 modeles predenis, compteur destinataires par evenement, notice Twilio, historique envois

**3 features restantes (batch 2) — COMPLETE et TESTEES:**
- Statistiques avancees : 6 KPIs, filtre par periode (Tout/30j/3m/1an), graphiques recharts (LineChart tendance mensuelle, PieChart repartition inscriptions, BarChart revenus par evenement), tableau detail par evenement
- Gestion communautaire : Pagination (page/limit, bouton 'Charger plus'), compteur messages, raccourci Ctrl+Entree, avatar auteur
- Remboursements admin : 4 cartes resume (en attente, approuves, refuses, montant), filtres par statut, note admin lors du refus

### Mars 2026 - Session 11 (Validation Refactorisation)
- Refactorisation OrganizerDashboard validee a 100% (16 sous-composants)
- 2 bugs corriges: import BoutiqueSection, SectionHeader BookingsSection

### Sessions precedentes (6-10)
- Gestion evenements, participants, inscriptions
- Import catalogues TopTex/XDConnects
- Commission Admin 1EUR/produit
- Refactorisation ProviderDashboard et OrganizerDashboard
- Homepage, page evenements

## Backlog Priorise

### P3 — COMPLETE
- [x] Facturation avancee (PDF branding)
- [x] Location RFID (Admin CRUD + gestion locations)
- [x] Check-in Jour J (barre progression + UX mobile)
- [x] Notifications SMS (templates + destinataires)
- [x] Statistiques avancees (filtres date + graphiques recharts)
- [x] Gestion communautaire (pagination + UX)
- [x] Remboursements admin (filtres statut + notes admin)

### Backlog restant
- [ ] Ameliorer onglet Commissions admin avec graphiques visuels (courbe mensuelle)
- [ ] Configurer cles Twilio pour envoi reel de SMS
- [ ] Gestion admin RFID avancee (historique locations, stats par organisateur)
- [ ] Export CSV des statistiques organisateur
- [ ] Paiement en ligne pour les locations RFID
- [ ] Refactorisation supplementaire de ProviderDashboard.js

## Integrations MOCKED
- **Twilio SMS** : Notifications sauvegardees en base de donnees mais non envoyees par SMS. En attente de configuration des cles API par l'utilisateur.

## Code Architecture
```
/app/frontend/src/components/
|-- organizer/ (16 components connectes)
|-- provider/ (4 components extraits)
|-- EventCommunity.js (pagination)

/app/backend/routers/
|-- admin.py, analytics.py (period filter), checkin.py
|-- community.py (pagination), events.py, invoices.py (PDF branding)
|-- notifications.py, organizer.py, provider.py
|-- provider_products.py, refunds.py (status filter + stats)
|-- rfid.py (admin stats), selections.py, shop.py
|-- sms.py (templates + recipients-count), timing.py
|-- toptex_importer.py, uploads.py, users.py
|-- xdconnects_import.py
```
