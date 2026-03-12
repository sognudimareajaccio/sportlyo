# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour des événements sportifs (marathon, trail, vélo, etc.), nommée SportLyo.

## Rôles Utilisateurs
- **Organisateurs** : Créent et gèrent des événements, les participants, les promotions, et suivent les performances.
- **Participants** : S'inscrivent aux courses, gèrent leurs documents (PPS), et accèdent à leurs billets.
- **Admin** : Supervise la plateforme, les utilisateurs et les finances.

## Architecture Technique
- **Frontend** : React, TailwindCSS, Shadcn UI, framer-motion, qrcode.react, react-share
- **Backend** : FastAPI (Python) - server.py monolithe
- **Database** : MongoDB
- **Auth** : JWT + Google OAuth (Emergent)
- **Paiements** : Stripe (commission 5% participant)
- **Accès** : Coming Soon par défaut, `?preview=SPORTLYO2026` pour accès complet

## Fonctionnalités Implémentées

### Phase 1 - Core (DONE)
- Authentification JWT + Google OAuth
- Création/gestion d'événements (CRUD)
- Inscription aux événements avec données personnelles
- Système de paiement Stripe avec commission 5%
- Attribution automatique de dossards
- Page publique "Coming Soon"

### Phase 2 - Chronométrage & Gestion (DONE)
- API RFID pour chronométrage (`/api/rfid-read`)
- Page de résultats avec classements temps réel par catégorie
- Interface de check-in par QR code
- Dashboard de gestion par événement
- Gestion des inscrits (ajout manuel, export CSV)
- Codes promo, partage réseaux sociaux
- Upload/validation de documents PPS
- Billet digital avec QR code
- Dashboard admin avec jauges de remplissage

### UI/UX (DONE)
- Dashboard organisateur avec cartes animées framer-motion
- Formulaire de création modernisé : Wizard multi-étapes (4 steps)
- Formulaire d'inscription modernisé : Wizard 3 étapes
- Page événement enrichie : OpenRunner, Google Maps, compteur temps réel
- Page de destination organisateurs (`/organizers`)
- **Section "Trouvez votre défi"** : 44 défis sportifs organisés en 7 groupes colorés (Running, Autres défis course, Multisport & Fun, Hivernaux & Extrêmes, Obstacles & Fitness, Défis Vélo, Endurance Outdoor)
- **Module de recherche EventsPage refondu** : Hero search glass-morphism, pilules de catégories avec icônes, filtres actifs en badges, vue grille/liste

### Contenu (DONE)
- 18 catégories de sport disponibles
- 12 événements réalistes avec images Unsplash pertinentes
- 44 défis sportifs cliquables avec redirection vers /events?search=

## Comptes Test
| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Participant | sophie@test.com | test1234 |

## Sports Disponibles
Cyclisme, Course à pied, Triathlon, Marche, Sports Mécaniques, Rallye Voitures, VTT, BMX, Cyclo-cross, Sports de raquette, Tir à l'arc, Kitesurf, Golf, Pétanque, Billard, Bowling, CrossFit, Sports de combat

## Tâches Restantes

### P1 - Communication
- Intégration Resend pour emails automatiques (confirmation inscription avec QR code)
- Gestion communautaire (interaction organisateur/participants)
- Facturation automatique

### P2 - Avancé
- Contact organisateur/admin pour remboursements
- Location de matériel RFID
- Fermeture automatique des inscriptions
- App mobile check-in
- Import CSV de temps depuis logiciels chronométrage
- Statistiques avancées organisateurs
- Intégration Twilio SMS

### Refactorisation Recommandée
- Découpage de `backend/server.py` en modules (routes, services, modèles)

## Intégrations Actives
- Stripe (paiements)
- Google OAuth (Emergent)
- fpdf2 (génération PDF)
- qrcode.react (QR codes billets)
- framer-motion (animations)
- react-share (partage social)

## Intégrations Planifiées
- Resend (emails)
- Twilio (SMS)
