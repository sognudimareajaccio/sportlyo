# SportLyo - PRD (Product Requirements Document)

## Problème original
Créer une plateforme de vente de tickets en ligne pour des événements sportifs (marathon, trail, vélo, etc.), nommée SportLyo.

## Architecture technique
- **Frontend:** React, TailwindCSS, Shadcn UI, Framer Motion, Lucide React
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Authentication:** JWT
- **Payment:** Square (production keys)
- **Email:** Resend (domaine non vérifié, adresse temporaire utilisée)

## Rôles utilisateurs
| Rôle | Description |
|------|-------------|
| Admin | Supervise la plateforme, utilisateurs, finances, messagerie |
| Organisateur | Crée/gère événements, participants, promotions |
| Participant | S'inscrit aux courses, gère documents PPS, billets |

## Fonctionnalités implémentées

### Phase 1 - Core (DONE)
- Authentification JWT (login/register)
- CRUD événements sportifs (18+ types de sports)
- Inscription participants avec formulaire multi-étapes
- Upload et gestion de documents PPS
- Paiement via Square
- Dashboard Participant, Organisateur, Admin
- Système de codes promo
- Export CSV/PDF des paiements
- Jauges de remplissage en temps réel

### Phase 2 - UX/UI (DONE)
- Page Coming Soon premium avec code d'accès (SPORTLYO2026)
- Refonte Login/Register avec fond animé glassmorphism
- Header/Navbar modernisé
- Page événements avec recherche/filtres
- Page d'accueil avec 18+ catégories sportives
- Scroll to top automatique
- Prix dynamique par épreuve

### Phase 3 - Communication (DONE - 13 Mars 2026)
- **Cartes de stats cliquables** : Dashboards Admin et Organisateur avec navigation fonctionnelle
- **Messagerie directe Admin ↔ Organisateur** : Système complet avec conversations, messages, statut de lecture, polling temps réel
- **Emails transactionnels** via Resend (confirmation compte + inscription)
- **Page d'atterrissage organisateur** pour le marketing

### Intégrations tierces
| Service | Statut | Notes |
|---------|--------|-------|
| Square | ACTIF (prod) | Clés de production utilisateur |
| Resend | ACTIF (limité) | Domaine non vérifié, adresse temporaire |
| Google Auth | SUPPRIMÉ | Retiré au profit de JWT |

## Comptes de test
| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Participant | sophie@test.com | test1234 |

## Tâches à venir

### P1 - Upcoming
- Facturation automatique pour les participants
- Gestion communautaire (interaction organisateur/participants par événement)

### P2 - Future
- Contact direct orga/admin pour remboursements
- Plateforme location matériel RFID
- Fermeture automatique des inscriptions
- App mobile check-in
- Import CSV temps de chronométrage
- Statistiques avancées organisateurs
- Intégration Twilio SMS

### Refactoring recommandé
- Découpage de `server.py` (monolithe) en modules (routers/, services/, models/)

## Collections MongoDB clés
- `users` - Utilisateurs avec rôles
- `events` - Événements avec races/épreuves
- `registrations` - Inscriptions participants (pps_pending flag)
- `payments` - Transactions Square
- `conversations` - Conversations messagerie (NEW)
- `messages` - Messages individuels (NEW)
- `waitlist_emails` - Emails page Coming Soon
- `admin_messages` - Anciens messages admin (legacy)
- `promo_codes` - Codes promotionnels
