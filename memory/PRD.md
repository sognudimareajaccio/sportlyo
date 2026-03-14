# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour des événements sportifs (marathon, trail, vélo, etc.), nommée SportLyo.

## Architecture
- **Frontend:** React, TailwindCSS, Shadcn UI, framer-motion, recharts
- **Backend:** FastAPI avec routeurs modulaires
- **Database:** MongoDB
- **Auth:** JWT
- **Paiements:** Square, SumUp (INTÉGRÉ)
- **Email:** Resend
- **PDF:** fpdf2, PyMuPDF

## Credentials de test
| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Prestataire | boutique@sportlyo.fr | boutique123 |

## Ce qui est implémenté

### Mars 2026 - Session 5 (Actuelle)
**Phase 1 ✅ :**
- Suppression produit prestataire par l'organisateur (bouton poubelle)
- Suppression upload PDF TopTex (gardé uniquement recherche par référence)
- Cartes produits portrait (3:4) avec carrousel dans l'espace organisateur
- Cartes catalogue prestataire portrait dans l'espace organisateur
- Galerie multi-photos (10 max) pour les prestataires
- Limite PDF 600MB avec progression page par page

### Mars 2026 - Session 4
- Fix Upload PDF TopTex + Fix Image lookup TopTex
- Partage événement modal moderne
- Commission non modifiable par organisateur
- Suppression "Devenir Organisateur" pour non-organisateurs
- Produits prestataire verrouillés pour organisateur

### Mars 2026 - Sessions 1-3
- Refactorisation backend, Dashboard Participant (7 widgets)
- Dashboard Prestataire (finances, ventes)
- Intégration SumUp, Notifications temps réel
- Messagerie participant-prestataire, Seeding données auto

## EN COURS — Phase 2 : Workflow Prestataire ↔ Organisateur

### Étape 1 ✅ (Catalogue prestataire brut — déjà fait)
Le prestataire intègre ses produits bruts sans personnalisation logo.

### Étape 2 (À faire)
- Upload logo par l'organisateur
- Sélection produits → notification au prestataire
- Le prestataire reçoit logo + liste des produits sélectionnés

### Étape 3 (À faire)
- Vue par organisateur dans l'espace prestataire (classement sélections)
- Personnalisation produits (nouvelles photos avec logo)
- Mise à jour auto des produits dans l'espace organisateur
- Statut : "En attente" → "Prêt à publier"
- Système d'alertes pour le prestataire

## Phase 3 (À faire) — Finances & Commissions
- Commission admin : 1€/produit vendu par le prestataire
- Espace Admin - Finances : Total commissions admin
- Espace Prestataire - Finances : Prix d'achat vs revente, commissions déduites, marge nette

## Backlog Priorisé

### P1
- [ ] Phase 2 : Workflow Prestataire ↔ Organisateur
- [ ] Phase 3 : Finances & Commissions admin/prestataire

### P2
- [ ] Système de facturation avancé
- [ ] Gestion communautaire
- [ ] Contact direct remboursements
- [ ] Location matériel RFID
- [ ] App mobile check-in
- [ ] Statistiques avancées organisateurs
- [ ] Notifications SMS (Twilio)
