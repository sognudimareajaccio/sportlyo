# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour des événements sportifs (marathon, trail, vélo, etc.), nommée SportLyo.

## Architecture
- **Frontend:** React, TailwindCSS, Shadcn UI, framer-motion, recharts, date-fns
- **Backend:** FastAPI avec routeurs modulaires
- **Database:** MongoDB (collections: users, events, products, provider_products, orders, selections, notifications, provider_messages, registrations, promo_codes, invoices)
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

### Mars 2026 - Session 8

**Phase C — Système de commission Admin ✅ (testé iteration_35):**
- Commission admin de 1€ par produit prestataire vendu
- Endpoint `GET /api/admin/commissions` avec total, breakdown par prestataire, commandes récentes
- Onglet "Commissions" dans le dashboard Admin avec cartes résumé, tableau par prestataire, et historique des commandes
- Dashboard prestataire mis à jour avec 4 cartes financières : Ventes, Commission organisateurs, Commission plateforme (orange), Revenu net
- Breakdown par organisateur enrichi avec 3 colonnes (commission organisateur, commission plateforme, revenu net)
- `GET /api/provider/stats` et `GET /api/provider/financial-breakdown` incluent désormais `total_admin_commission`
- `POST /api/shop/order` calcule et stocke `admin_commission_total` sur chaque commande
- Migration automatique des commandes existantes au démarrage du serveur

**Bug fix — Images XD Connects ✅:**
- Sanitisation des URLs d'images : encodage des espaces en `%20` côté backend (scraper) et frontend (getProductImages)
- Note : certaines images XD Connects peuvent rester cassées à cause de restrictions CORS du CDN xdconnects.com

### Mars 2026 - Session 7

**Import XD Connects / Xindao ✅ (testé iteration_34):**
- Nouvel onglet "Import XD Connects" dans l'espace prestataire
- Recherche par référence via scraping Playwright
- Affichage fiche produit complète + ajout au catalogue en un clic

**Bug fix — Cloche notifications ✅**
**Changement nom prestataire**: SportWear Lyon → Moreati ✅

### Mars 2026 - Session 6 (Phases A & B)

**Phase A - Gestion événements ✅ (testé iteration_32):**
- Refonte formulaire création/édition événement (multi-étapes)
- Upload règlement PDF + champ "T-shirt fourni"
- Système publication/dépublication

**Phase B - Améliorations participant & événements ✅ (testé iteration_33):**
- Dashboard participant: widgets "Nouveau Défi" + "Agenda"
- Contact d'urgence obligatoire à l'inscription
- Page "Tous les événements" : classement par mois + seuls publiés

### Sessions précédentes
- Workflow Prestataire ↔ Organisateur, Galerie multi-photos
- Dashboard Prestataire (finances, ventes), Intégration SumUp
- Notifications temps réel, Messagerie, Seeding données

## Backlog Priorisé

### P1 — Refactorisation
- [ ] Décomposer OrganizerDashboard.js (2837 lignes) en composants
- [ ] Décomposer ProviderDashboard.js (1191 lignes) en composants

### P2
- [ ] Système de facturation avancé
- [ ] Gestion communautaire
- [ ] Contact direct remboursements
- [ ] Location matériel RFID
- [ ] App mobile check-in
- [ ] Statistiques avancées organisateurs
- [ ] Notifications SMS (Twilio)

## Endpoints Clés
- `POST /api/events` → création événement avec notifications admin
- `PUT /api/events/{id}/publish` → publication/dépublication
- `GET /api/events` → événements publiés uniquement
- `GET /api/admin/commissions` → commissions admin sur ventes prestataires
- `POST /api/shop/order` → commande avec calcul admin_commission_total
- `GET /api/provider/stats` → stats prestataire avec admin_commission
- `GET /api/provider/financial-breakdown` → breakdown financier avec admin_commission par organisateur
- `POST /api/organizer/add-provider-product` → crée sélection + notifie
- `GET /api/provider/selections` → sélections par organisateur
- `GET /api/provider/import/xdconnects/lookup/{ref}` → recherche produit XD Connects

## DB Schema clés
- **events**: published (bool), regulations_pdf_url (str), provides_tshirt (bool), races[].description (str)
- **orders**: admin_commission_total (float), items[].admin_commission (float), items[].provider_id (str)
- **selections**: organizer_id, organizer_logo, products[{customization_status, custom_images}], status
- **registrations**: emergency_contact (requis), emergency_phone (requis)
