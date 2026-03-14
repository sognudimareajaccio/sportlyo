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
| Prestataire | Fournisseur de produits, gère catalogue, voit commandes |

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
│   │   ├── organizer.py
│   │   ├── participant.py    # NEW
│   │   ├── payments.py
│   │   ├── provider.py
│   │   ├── registrations.py
│   │   ├── shop.py
│   │   ├── timing.py
│   │   └── uploads.py
│   ├── models.py
│   ├── deps.py
│   └── server.py
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── organizer/     # Composants extraits du dashboard organisateur
│       │   └── ui/            # Shadcn components
│       ├── pages/
│       │   ├── ParticipantDashboard.js  # REFAIT - Hub + 7 sections
│       │   ├── OrganizerDashboard.js    # En cours de refactorisation
│       │   └── ...
│       └── ...
```

## Ce qui est implémenté

### Mars 2026
- Refactorisation massive du backend (server.py monolithique -> routeurs modulaires)
- Création de composants organizer/ pour le dashboard organisateur
- **Dashboard Participant redesigné** avec hub à widgets :
  - Mon Profil (vue + édition)
  - Mes Inscriptions (liste + factures)
  - Courses à Venir
  - Mes Résultats (stats par événement)
  - Bilan Sportif Annuel (charts, stats km/dénivelé/dépenses)
  - Mes Commandes Boutique
  - Messagerie Prestataire
- Backend endpoints participant: GET/PUT /api/participant/profile, GET /api/participant/orders, stats, upcoming, results, providers
- Correction flux commandes : les prestataires reçoivent les commandes (provider_ids array)
- Messagerie participant-prestataire via /api/provider/messages

## Backlog Priorisé

### P0 (Haute priorité)
- [ ] Achever la refactorisation du frontend OrganizerDashboard.js (composants non encore intégrés)

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
