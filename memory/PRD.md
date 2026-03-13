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
| Organisateur | Crée/gère événements, participants, promotions, check-in, correspondances |
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

### Phase 3 - Communication & Dashboards (DONE - 13 Mars 2026)
- Cartes de stats cliquables Admin Dashboard
- Messagerie directe Admin ↔ Organisateur
- Emails transactionnels via Resend
- Jauges de remplissage fond sombre (Admin + Organisateur)

### Phase 4 - Refonte Espace Organisateur (DONE - 13 Mars 2026)
**Hub avec grille de 9 boutons rectangulaires :**
1. **Événements** — Liste de tous les événements avec cartes visuelles, actions CRUD
2. **Participants** — Liste complète avec recherche, filtre par événement, tableau complet
3. **Jauges** — Remplissage temps réel sur fond sombre par événement
4. **Check-in** — Gestion dossards auto-générés, scan QR, recherche, statut récupération kit (couleur verte), export CSV chronométrage
5. **Finances** — Revenus par événement, export CSV/PDF, résumé financier
6. **Correspondances** — Envois groupés/individuels aux inscrits (interne + email via Resend), historique des envois
7. **Partage** — Liens partage réseaux sociaux (Facebook, Twitter, WhatsApp, Email)
8. **Contact Admin** — Messagerie sécurisée avec l'administration
9. **Résultats** — Import CSV chronométrage, vue résultats par événement

### Intégrations tierces
| Service | Statut | Notes |
|---------|--------|-------|
| Square | ACTIF (prod) | Clés de production utilisateur |
| Resend | ACTIF (limité) | Domaine non vérifié, adresse temporaire |

## Comptes de test
| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |

## Tâches à venir

### P1 - Upcoming
- Facturation automatique pour les participants
- Gestion communautaire (interaction organisateur/participants par événement)

### P2 - Future
- Plateforme location matériel RFID
- Fermeture automatique des inscriptions
- App mobile check-in
- Import CSV temps de chronométrage (UI prête, implémentation backend pending)
- Statistiques avancées organisateurs
- Intégration Twilio SMS

### Refactoring recommandé
- Découpage de `server.py` (monolithe) en modules (routers/, services/, models/)

## Collections MongoDB clés
- `users`, `events`, `registrations`, `payments`
- `conversations`, `messages` (messagerie)
- `correspondances` (envois organisateur → participants)
- `waitlist_emails`, `admin_messages`, `promo_codes`
