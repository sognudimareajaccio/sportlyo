# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour des événements sportifs (marathon, trail, vélo, etc.), nommée SportLyo.

## Architecture
- **Frontend:** React, TailwindCSS, Shadcn UI, framer-motion, recharts
- **Backend:** FastAPI avec routeurs modulaires
- **Database:** MongoDB
- **Auth:** JWT
- **Paiements:** Square (liens de paiement pour entreprises), SumUp (paiement boutique en ligne - INTÉGRÉ)
- **Email:** Resend
- **PDF:** fpdf2

## Rôles
| Rôle | Description |
|------|-------------|
| Admin | Supervise la plateforme, valide inscriptions organisateurs et prestataires |
| Organisateur | Crée et gère événements, participants, promotions, boutique |
| Participant | S'inscrit aux courses, gère documents, achète produits dérivés |
| Prestataire | Fournisseur de produits, gère catalogue, voit commandes, finances et ventes |

## Credentials de test
| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Prestataire | boutique@sportlyo.fr | boutique123 |

## Ce qui est implémenté

### Mars 2026 - Session 4
- **Fix Bug P0: Upload PDF TopTex** : Implémentation d'un traitement en arrière-plan (background task) avec streaming par chunks (512KB). Upload retourne un `task_id`, le client poll `/api/provider/import/pdf-status/{task_id}` pour obtenir les résultats. Supporte fichiers jusqu'à 100MB.
- **Fix Bug P0: Image manquante lookup TopTex** : Extraction de l'image depuis la balise `og:image` de la page produit TopTex au lieu de deviner l'URL. Couleurs extraites depuis les stickers (source fiable) avec traduction FR.

### Mars 2026 - Session 3
- **Intégration SumUp réelle** : Checkout API + Payment Widget
- Credentials SumUp: Merchant Code MMS8TC4Q, API Key dans backend/.env

### Mars 2026 - Session 2
- **Notifications en temps réel** : cloche dans le header (participant + prestataire)
- **Widget Financier Prestataire** : Ventes totales, Commissions dues, Revenu net par organisateur
- **Widget Répartition des Ventes** : Top produits, catégories, tailles, tableau CA

### Mars 2026 - Session 1
- Refactorisation massive du backend (server.py -> routeurs modulaires)
- Dashboard Participant redesigné avec hub à widgets (7 sections)
- Correction flux commandes : prestataires reçoivent les commandes
- Messagerie participant-prestataire

## Backlog Priorisé

### P0 (Haute priorité)
- [x] Fix upload PDF TopTex (background task + streaming)
- [x] Fix image manquante lookup TopTex (og:image extraction)

### P1 (Moyenne priorité)
- [ ] Système de facturation avancé (interface dédiée, téléchargement PDF)
- [ ] Achever la refactorisation du frontend OrganizerDashboard.js

### P2 (Future)
- [ ] Gestion communautaire
- [ ] Contact direct remboursements
- [ ] Location matériel RFID
- [ ] Fermeture auto inscriptions
- [ ] App mobile check-in
- [ ] Statistiques avancées organisateurs
- [ ] Notifications SMS (Twilio)

## Intégrations Tierces
| Service | Statut |
|---------|--------|
| Square | Intégré (liens de paiement entreprises) |
| SumUp | INTÉGRÉ (paiement boutique en ligne) |
| Resend | Intégré (emails) |
| recharts | Intégré (graphiques) |
| fpdf2 | Intégré (factures PDF) |
| TopTex | INTÉGRÉ (import catalogue via PDF ou recherche par référence) |

## Endpoints Clés Import TopTex
- `POST /api/provider/import/parse-pdf` → retourne `{task_id}` (traitement en arrière-plan)
- `GET /api/provider/import/pdf-status/{task_id}` → retourne `{status, products, total}`
- `GET /api/provider/import/lookup/{ref}` → retourne `{product}` avec image extraite de og:image
- `POST /api/provider/import/add-single` → ajoute un produit au catalogue
- `POST /api/provider/import/confirm` → importe plusieurs produits sélectionnés
