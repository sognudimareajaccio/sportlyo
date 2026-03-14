# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour des événements sportifs (marathon, trail, vélo, etc.), nommée SportLyo.

## Architecture
- **Frontend:** React, TailwindCSS, Shadcn UI, framer-motion, recharts
- **Backend:** FastAPI avec routeurs modulaires
- **Database:** MongoDB (collections: users, events, products, provider_products, orders, selections, notifications, provider_messages)
- **Auth:** JWT
- **Paiements:** Square, SumUp (INTÉGRÉ)

## Credentials de test
| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Prestataire | boutique@sportlyo.fr | boutique123 |

## Ce qui est implémenté

### Mars 2026 - Session 5

**Phase 1 ✅ :**
- Suppression produit prestataire par l'organisateur
- Suppression upload PDF TopTex (gardé uniquement recherche par référence)
- Cartes produits portrait (3:4) avec carrousel dans l'espace organisateur + prestataire
- Galerie multi-photos (10 max) pour les prestataires
- Bloc explicatif boutique (4 étapes + avantage financier)

**Phase 2 ✅ : Workflow Prestataire ↔ Organisateur**
- Étape 1: Catalogue prestataire brut (déjà fait)
- Étape 2: Upload logo organisateur → sélection produits → notification prestataire
  - Collection `selections` avec organizer_logo, products, status
  - Quand l'organisateur ajoute un produit prestataire → sélection créée/enrichie + notification
- Étape 3: Personnalisation par le prestataire
  - Vue "Sélections" dans l'espace prestataire (classement par organisateur)
  - Stats : En attente / En cours / Prêts
  - Dialog de personnalisation avec upload photos (10 max)
  - Auto-sync des photos vers l'espace organisateur
  - Statut: pending → in_progress → ready
  - Badges dans l'espace organisateur : "En attente" (amber) / "Prêt" (vert)
  - Notifications automatiques (nouvelle sélection, personnalisation terminée)

### Sessions précédentes
- Refactorisation backend, Dashboard Participant (7 widgets)
- Dashboard Prestataire (finances, ventes)
- Intégration SumUp, Notifications temps réel
- Messagerie, Seeding données auto
- Partage événement modal, Commission non modifiable

## EN COURS — Phase 3 : Finances & Commissions

### À faire
- Commission admin : 1€/produit vendu par le prestataire
- Espace Admin - Finances : Total commissions admin, détail par prestataire
- Espace Prestataire - Finances :
  - Prix d'achat vs prix de revente
  - Commission organisateur déduite
  - Commission admin (1€) déduite
  - Marge nette par produit et globale

## Backlog Priorisé

### P1
- [ ] Phase 3 : Finances & Commissions admin/prestataire

### P2
- [ ] Système de facturation avancé
- [ ] Gestion communautaire
- [ ] Contact direct remboursements
- [ ] Location matériel RFID
- [ ] App mobile check-in
- [ ] Statistiques avancées organisateurs
- [ ] Notifications SMS (Twilio)

## Endpoints Clés Sélections
- `POST /api/organizer/add-provider-product` → crée/enrichit une sélection + notifie
- `GET /api/provider/selections` → sélections groupées par organisateur
- `GET /api/provider/selections/stats` → compteurs par statut
- `GET /api/provider/selections/{id}` → détail sélection
- `PUT /api/provider/selections/{id}/customize/{index}` → personnalise + auto-sync
- `PUT /api/provider/selections/{id}/status` → met à jour le statut
- `GET /api/organizer/selections` → sélections côté organisateur
