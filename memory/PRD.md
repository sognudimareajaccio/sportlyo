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

### Mars 2026 - Session 3
- **Intégration SumUp réelle** : Checkout API + Payment Widget
  - Backend crée des checkouts via `POST https://api.sumup.com/v0.1/checkouts`
  - Frontend charge le SDK SumUp et monte le widget de paiement par carte
  - Endpoint de vérification `POST /api/shop/verify-payment/{order_id}` valide le statut PAID/FAILED
  - Statut commande: en_attente → confirmée (après paiement)
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
- [ ] Achever la refactorisation du frontend OrganizerDashboard.js

### P1 (Moyenne priorité)
- [ ] Système de facturation avancé (interface dédiée, téléchargement PDF)

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
