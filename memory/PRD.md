# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour des événements sportifs (marathon, trail, vélo, etc.), nommée SportLyo.

## Architecture
- **Frontend:** React, TailwindCSS, Shadcn UI, framer-motion, recharts
- **Backend:** FastAPI avec routeurs modulaires
- **Database:** MongoDB
- **Auth:** JWT
- **Paiements:** Square (liens de paiement), SumUp (SIMULÉ)
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

## Structure Code
```
/app/
├── backend/
│   ├── routers/
│   │   ├── admin.py
│   │   ├── auth.py
│   │   ├── chat.py
│   │   ├── events.py
│   │   ├── messaging.py
│   │   ├── notifications.py   # NEW - Système de notifications
│   │   ├── organizer.py
│   │   ├── participant.py     # NEW - Endpoints participant
│   │   ├── payments.py
│   │   ├── provider.py        # UPDATED - Finances + Ventes
│   │   ├── registrations.py
│   │   ├── shop.py            # UPDATED - Notifications sur commandes
│   │   ├── timing.py
│   │   └── uploads.py
│   ├── models.py
│   ├── deps.py
│   └── server.py
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── NotificationBell.js  # NEW - Cloche notifications
│       │   ├── organizer/
│       │   └── ui/
│       ├── pages/
│       │   ├── ParticipantDashboard.js  # REFAIT - Hub + 7 sections + notifications
│       │   ├── ProviderDashboard.js     # UPDATED - 6 onglets + Finances + Ventes
│       │   ├── OrganizerDashboard.js    # En cours de refactorisation
│       │   └── ...
│       └── ...
```

## Ce qui est implémenté

### Mars 2026 - Session 2
- **Système de notifications en temps réel** : cloche dans le header (participant + prestataire)
  - Notifications créées automatiquement sur message et commande
  - Polling toutes les 15 secondes, panel avec badge compteur
  - Endpoints: GET /api/notifications, POST /api/notifications/read, GET /api/notifications/unread-count
- **Widget Financier Prestataire** (onglet Finances) :
  - 3 cartes résumé : Ventes totales, Commissions dues, Revenu net
  - Tableau de commissions par organisateur avec barre de marge nette
- **Widget Répartition des Ventes** (onglet Ventes) :
  - Graphique barres horizontales : top produits vendus
  - Camembert : ventes par catégorie
  - Distribution par taille (barres verticales)
  - Tableau détaillé chiffre d'affaires avec totaux

### Mars 2026 - Session 1
- Refactorisation massive du backend (server.py -> routeurs modulaires)
- Dashboard Participant redesigné avec hub à widgets (7 sections)
- Backend endpoints participant (profile, orders, stats, upcoming, results, providers)
- Correction flux commandes : prestataires reçoivent les commandes
- Messagerie participant-prestataire

## Backlog Priorisé

### P0 (Haute priorité)
- [ ] Achever la refactorisation du frontend OrganizerDashboard.js

### P1 (Moyenne priorité)
- [ ] Intégration SumUp (paiement boutique réel) - BLOQUÉ
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
| Square | Intégré (liens de paiement) |
| Resend | Intégré (emails) |
| recharts | Intégré (graphiques) |
| fpdf2 | Intégré (factures PDF) |
| SumUp | SIMULÉ (bloqué) |
