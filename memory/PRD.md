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

### Mars 2026 - Session 9 (P2 Features)

**1. Facturation avancée (PDF) ✅ (testé iteration_36):**
- `GET /api/invoices/{id}/pdf` : Génération PDF professionnelle avec fpdf2
- `GET /api/admin/invoices` : Vue admin de toutes les factures
- Bouton "Télécharger PDF" dans dashboard participant et admin
- Onglet "Factures" dans le dashboard Admin

**2. Gestion communautaire ✅ (testé iteration_36):**
- Composant `EventCommunity` intégré dans EventDetailPage
- CRUD posts communautaires (créer, supprimer, liker, épingler)
- Système de réponses (replies) avec notifications
- Badge "Organisateur" pour les posts de l'organisateur
- Routeur: `backend/routers/community.py`

**3. Demandes de remboursement ✅ (testé iteration_36):**
- Bouton "Demander un remboursement" sur chaque inscription payée
- Formulaire avec motif obligatoire
- Onglet "Remboursements" dans Admin : approuver/refuser
- Notifications admin et organisateur automatiques
- Routeur: `backend/routers/refunds.py`

**4. Location matériel RFID ✅ (testé iteration_36):**
- Catalogue de 6 équipements RFID seedés au démarrage
- Page `/rfid` avec panier, sélection d'événement, dates
- Système de demande de location (pending → confirmed/rejected)
- Gestion admin dans dashboard
- Routeur: `backend/routers/rfid.py`

**5. Application check-in mobile ✅ (testé iteration_36):**
- Page `/checkin` pour les organisateurs
- Scan par numéro de dossard ou recherche par nom
- Stats en temps réel (enregistrés/restants/taux)
- Annulation de check-in (undo)
- Affichage contact d'urgence et taille T-shirt
- Routeur: `backend/routers/checkin.py`

**6. Statistiques avancées organisateurs ✅ (testé iteration_36):**
- `GET /api/organizer/analytics` : Vue d'ensemble, tendance mensuelle, breakdown par événement et par épreuve
- Section "Statistiques" dans le hub organisateur
- Graphiques barres mensuels, répartition tailles T-shirt
- Routeur: `backend/routers/analytics.py`

**7. Notifications SMS (Twilio) ✅ (testé iteration_36):**
- Envoi SMS aux participants d'un événement
- Mode graceful degradation : SMS stockés en base si Twilio non configuré
- Historique des envois avec statut
- Section "Notifications SMS" dans hub organisateur
- Config Twilio vérifiable via `/api/sms/config`
- **NOTE: Twilio non configuré - SMS en mode queue uniquement**
- Routeur: `backend/routers/sms.py`

### Mars 2026 - Session 8

**Phase C — Commission Admin ✅ (testé iteration_35):**
- Commission 1€/produit prestataire vendu
- Onglet "Commissions" dans dashboard Admin
- Dashboard prestataire mis à jour avec commission plateforme

**Bug fix — Images XD Connects ✅:**
- Sanitisation URLs images (%20)

### Sessions précédentes (6-7)
- Phase A & B (événements, participant) ✅
- Import XDConnects/Playwright ✅
- Corrections cloche notifications, nom prestataire ✅
- Améliorations homepage ✅

## Backlog Priorisé

### P1 — Refactorisation
- [ ] Décomposer OrganizerDashboard.js (~2900 lignes)
- [ ] Décomposer ProviderDashboard.js (~1200 lignes)

### P2 — Complété ✅
- [x] Facturation avancée PDF
- [x] Gestion communautaire
- [x] Remboursements
- [x] Location RFID
- [x] Check-in mobile
- [x] Statistiques avancées
- [x] Notifications SMS (Twilio)

### P3 — Futur
- [ ] Configurer clés Twilio pour envoi réel de SMS
- [ ] Gestion admin RFID (ajout/modification équipements)
- [ ] Export CSV des statistiques organisateur
- [ ] Intégration paiement en ligne pour les locations RFID
- [ ] Amélioration graphiques (recharts) dans analytics

## Code Architecture
```
/app/backend/routers/
├── admin.py          # Admin dashboard, commissions
├── analytics.py      # NEW - Organizer analytics
├── checkin.py        # NEW - Check-in mobile
├── community.py      # NEW - Event community posts/replies
├── events.py         # Event CRUD
├── invoices.py       # NEW - PDF invoices
├── notifications.py  # Real-time notifications
├── organizer.py      # Organizer dashboard
├── provider.py       # Provider dashboard
├── provider_products.py
├── refunds.py        # NEW - Refund requests
├── rfid.py           # NEW - RFID equipment rental
├── selections.py     # Provider-organizer workflow
├── shop.py           # Shop orders
├── sms.py            # NEW - SMS notifications (Twilio)
├── toptex_importer.py
├── uploads.py
├── users.py
└── xdconnects_import.py
```

## Endpoints Clés (nouveaux)
- `GET /api/invoices/{id}/pdf` → PDF facture
- `GET /api/admin/invoices` → Toutes les factures
- `GET /api/events/{id}/community` → Posts communautaires
- `POST /api/refunds/request` → Demande remboursement
- `GET /api/admin/refunds/all` → Toutes les demandes
- `GET /api/rfid/equipment` → Catalogue RFID
- `POST /api/rfid/rentals` → Demande location
- `POST /api/checkin/scan` → Check-in participant
- `GET /api/checkin/stats/{event_id}` → Stats check-in
- `GET /api/organizer/analytics` → Analytics avancées
- `POST /api/sms/send` → Envoi SMS
- `GET /api/sms/config` → Config Twilio

## DB Collections (nouvelles)
- **community_posts**: posts communautaires par événement
- **community_replies**: réponses aux posts
- **refund_requests**: demandes de remboursement
- **rfid_equipment**: catalogue matériel RFID
- **rfid_rentals**: demandes de location
- **sms_notifications**: historique SMS envoyés/en attente
