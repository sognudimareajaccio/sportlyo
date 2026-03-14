# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour des événements sportifs (marathon, trail, vélo, etc.), nommée SportLyo.

## Architecture
- **Frontend:** React, TailwindCSS, Shadcn UI, framer-motion, recharts, date-fns
- **Backend:** FastAPI avec routeurs modulaires
- **Database:** MongoDB (collections: users, events, products, provider_products, orders, selections, notifications, provider_messages, registrations, promo_codes)
- **Auth:** JWT
- **Paiements:** Square, SumUp (INTÉGRÉ)

## Credentials de test
| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Prestataire | boutique@sportlyo.fr | boutique123 |
| Organisateur | contact@lyonrunning.fr | lyon1234 |
| Organisateur | events@marseilletrail.fr | mars1234 |

## Ce qui est implémenté

### Mars 2026 - Session 7

**Import XD Connects / Xindao ✅ (testé iteration_34):**
- Nouvel onglet "Import XD Connects" dans l'espace prestataire
- Recherche par référence (T9101, P706.33, V43009...) via scraping Playwright
- Affichage fiche produit complète (nom, prix, marque, catégorie, tailles, couleurs, matière, USPs)
- Ajout au catalogue en un clic avec détection de doublons
- Lien externe vers la page produit sur XDConnects

### Mars 2026 - Session 6 (Phases A & B)

**Phase A - Gestion événements ✅ (testé iteration_32):**
- Refonte formulaire création/édition événement (multi-étapes)
- Upload règlement PDF + champ "T-shirt fourni"
- Gestion améliorée des épreuves (description, réorganisation up/down)
- Système publication/dépublication avec badges Publié/Brouillon
- Notification admin à la création d'événement

**Phase B - Améliorations participant & événements ✅ (testé iteration_33):**
- Suppression page "Accès réservé" (ComingSoonPage guard)
- Dashboard participant: widget "Nouveau Défi" (événements récents)
- Dashboard participant: widget "Agenda des événements" (inscriptions à venir avec J-X)
- Contact d'urgence obligatoire à l'inscription (backend + frontend)
- Page "Tous les événements": classement par mois + seuls événements publiés

### Mars 2026 - Session 5

**Phase 1 ✅ :**
- Suppression produit prestataire par l'organisateur
- Cartes produits portrait avec carrousel
- Galerie multi-photos pour les prestataires
- Bloc explicatif boutique

**Phase 2 ✅ : Workflow Prestataire ↔ Organisateur**
- Collection `selections` pour demandes de personnalisation
- Upload logo organisateur → sélection → notification prestataire
- Personnalisation par le prestataire avec auto-sync
- Badges statut dans l'espace organisateur

### Sessions précédentes
- Refactorisation backend, Dashboard Participant (7 widgets)
- Dashboard Prestataire (finances, ventes)
- Intégration SumUp, Notifications temps réel
- Messagerie, Seeding données auto
- Partage événement modal, Commission non modifiable

## Backlog Priorisé

### P0 — Prochaine priorité
- [ ] Phase C : Système de commission Admin
  - Commission admin 1€/produit vendu par le prestataire
  - Dashboard financier admin : suivi commissions
  - Dashboard financier prestataire : visibilité commissions (organisateur + admin)

### P2
- [ ] Système de facturation avancé
- [ ] Gestion communautaire
- [ ] Contact direct remboursements
- [ ] Location matériel RFID
- [ ] App mobile check-in
- [ ] Statistiques avancées organisateurs
- [ ] Notifications SMS (Twilio)

### Refactorisation
- [ ] Décomposer OrganizerDashboard.js (2838 lignes) en composants
- [ ] Décomposer ProviderDashboard.js en composants

- `/api/provider/import/xdconnects/lookup/{ref}` → (GET) Recherche produit XD Connects par référence
- `/api/provider/import/xdconnects/add-single` → (POST) Import produit XD Connects au catalogue

## Endpoints Clés
- `POST /api/events` → création événement avec notifications admin
- `PUT /api/events/{id}/publish` → publication/dépublication
- `GET /api/events` → événements publiés uniquement
- `GET /api/organizer/events` → tous les événements de l'organisateur
- `GET /api/participant/new-events` → événements récents pour "Nouveau Défi"
- `POST /api/registrations` → inscription avec validation contact d'urgence obligatoire
- `POST /api/organizer/add-provider-product` → crée sélection + notifie
- `GET /api/provider/selections` → sélections par organisateur
- `PUT /api/provider/selections/{id}/customize/{index}` → personnalise + auto-sync

## DB Schema clés
- **events**: published (bool), regulations_pdf_url (str), provides_tshirt (bool), races[].description (str)
- **selections**: organizer_id, organizer_logo, products[{customization_status, custom_images}], status
- **registrations**: emergency_contact (requis), emergency_phone (requis)
