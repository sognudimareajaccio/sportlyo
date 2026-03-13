# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour événements sportifs (marathon, trail, vélo, MMA, etc.).

## Architecture
- **Frontend:** React + TailwindCSS + Shadcn UI + framer-motion + recharts
- **Backend:** FastAPI (Python) — refactorisé avec APIRouter modulaires
  - `server.py` — Routes principales (auth, events, registrations, payments, shop, invoices)
  - `routers/provider.py` — Routes prestataire (catalogue, commandes, messagerie)
  - `deps.py` — Dépendances partagées (db, auth, JWT)
- **Database:** MongoDB
- **Auth:** JWT
- **Paiement:** Square (intégré), SumUp (intégré, mode simulation sans clé API)
- **Email:** Resend

## Rôles
- **Organisateurs:** Événements, participants, boutique prestataire, messagerie
- **Participants:** Inscription, documents PPS, boutique, factures
- **Admin:** Supervision, validation prestataires, finances
- **Prestataire:** Catalogue produits, commandes, messagerie organisateurs

## Ce qui est implémenté

### Authentification
- Login/Register glassmorphism, JWT, 4 rôles (admin, organizer, participant, provider)
- Inscription prestataire avec validation admin

### Événements
- CRUD événements, courses multiples, jauges, page détail complète
- Inscription avancée, paiement Square intégré

### Hub Organisateur (complet)
- Dashboard centralisé, graphiques recharts
- Sections : Événements, Participants, Jauges, Check-in QR, Finances
- Correspondances, Chronométrage, Partenaires CRM, Sponsors CRM
- Boutique : catalogue propre + catalogue prestataire + commandes + messagerie prestataire
- Label "Commission pour l'organisateur"

### Dashboard Prestataire (NOUVEAU)
- Catalogue produits (CRUD), commandes reçues, statistiques
- Messagerie avec organisateurs

### Boutique Participant
- Section discrète sur page événement (4 articles max + "Plus d'articles")
- Page dédiée `/events/{eventId}/shop` style RunningHeroes
- Commande : taille, couleur, quantité, livraison (sur place/domicile)

### Facturation automatique (NOUVEAU)
- Facture auto-générée à chaque commande boutique
- API GET /api/invoices pour les participants
- Section "Mes factures" dans le dashboard participant

### SumUp (NOUVEAU)
- Intégration checkout SumUp prête (mode simulation sans clé API)
- Bascule auto en mode réel avec SUMUP_API_KEY + SUMUP_MERCHANT_CODE

### Refactorisation backend (NOUVEAU)
- Routes prestataire extraites dans `routers/provider.py`
- Module partagé `deps.py`

### Landing page organisateur
- Feature "Boutique personnalisée" ajoutée
- Section écosystème "Boutique intégrée, zéro stock"

### Messagerie & Admin
- Messagerie directe organisateur/admin
- Admin : validation prestataires, cartes cliquables, dashboard financier

## Backlog Priorisé

### P0 - Critique
- Poursuivre refactorisation server.py (extraire auth, events, admin dans des routeurs séparés)

### P1 - Important
- Activer SumUp en production (fournir SUMUP_API_KEY)
- Facturation sur inscriptions événements (pas seulement boutique)
- Factures PDF téléchargeables

### P2 - Futur
- Gestion communautaire organisateurs/participants
- Contact direct remboursement
- Plateforme location matériel RFID
- Fermeture automatique inscriptions
- App mobile check-in
- Statistiques avancées organisateurs
- Intégration Twilio SMS

## Credentials Test
| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Prestataire | boutique@sportlyo.fr | boutique123 |
