# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour événements sportifs (marathon, trail, vélo, MMA, etc.).

## Architecture
- **Frontend:** React + TailwindCSS + Shadcn UI + framer-motion + recharts
- **Backend:** FastAPI (Python) — refactorisé avec APIRouter modulaires
  - `server.py` — Routes principales (auth, events, registrations, payments, shop, invoices, bookings, logo, payment links)
  - `routers/provider.py` — Routes prestataire (catalogue, commandes, messagerie, logos)
  - `deps.py` — Dépendances partagées (db, auth, JWT)
- **Database:** MongoDB
- **Auth:** JWT (4 rôles : admin, organizer, participant, provider)
- **Paiement:** Square (intégré, liens de paiement), SumUp (intégré, mode simulation)
- **Email:** Resend

## Rôles
- **Organisateurs:** Événements, participants, boutique, sponsors, partenaires, réservations entreprises, messagerie prestataire
- **Participants:** Inscription, documents PPS, boutique, factures
- **Admin:** Supervision, validation prestataires, finances
- **Prestataire:** Catalogue produits, logos organisateurs, commandes, messagerie

## Ce qui est implémenté

### Hub Organisateur
- Grille de navigation : Événements, Participants, Jauges, Check-in, Finances, Correspondances, Chronométrage, Partenaires, **Réservation Entreprises**, Sponsors, Boutique Produits

### Boutique — Flux logo + personnalisation
- Étape 1 : Upload logo HD (PNG/SVG/PDF) obligatoire
- Logo transmis au prestataire via son dashboard
- Catalogue prestataire browsable + ajout par événement
- Messagerie prestataire avec liste complète des prestataires (même sans historique)

### Réservation Entreprises (NOUVEAU)
- CRUD complet : nom entreprise, contact, email, nombre d'équipes, membres/équipe, prix/équipe
- Total automatique calculé
- Génération de **liens de paiement Square** par réservation
- Bouton "Copier lien" pour envoi direct

### Sponsors & Donateurs — Liens de paiement
- Bouton "Lien paiement" Square sur chaque sponsor ayant un montant
- Lien copiable en un clic
- Paiements comptabilisés dans la collection payment_transactions

### Dashboard Prestataire
- Catalogue produits (CRUD), commandes, statistiques
- **Logos organisateurs** : visualisation + téléchargement HD
- Messagerie avec organisateurs

### Facturation automatique
- Facture auto-générée à chaque commande boutique
- Section "Mes factures" dans le dashboard participant

### Landing page organisateur
- Features : Boutique personnalisée, Chronométrage, PPS, etc.
- Écosystème : Boutique intégrée zéro stock

## Backlog Priorisé

### P0
- Poursuivre refactorisation server.py (extraire auth, events, admin)

### P1
- Activer SumUp en production (clés API)
- Factures PDF téléchargeables
- Factures sur inscriptions événements

### P2
- Gestion communautaire, RFID, app mobile check-in, stats avancées, Twilio SMS

## Credentials Test
| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Prestataire | boutique@sportlyo.fr | boutique123 |
