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
- Inscription aux événements avec données personnelles (nom, prénom, date de naissance, sexe, calcul âge)
- Système de paiement Stripe avec commission 5%
- Attribution automatique de dossards
- Page publique "Coming Soon"

### Phase 2 - Chronométrage & Gestion (DONE)
- API RFID pour chronométrage (`/api/rfid-read`)
- Page de résultats avec classements temps réel par catégorie
- Interface de check-in par QR code
- Dashboard de gestion par événement (`/organizer/event/{id}`)
- Gestion des inscrits (ajout manuel, export CSV)
- Codes promo
- Partage réseaux sociaux
- Guide d'intégration chronométrage (snippets cURL/Python)
- Export chronométrage CSV
- Upload/validation de documents PPS
- Billet digital avec QR code
- Dashboard admin avec jauges de remplissage
- Filtres par événement sur exports financiers
- Simulation chronométrage (test_rfid_simulation.py)

### UI/UX (DONE)
- Logos SportLyo sur toutes les pages (navbar, login, register)
- Dashboard organisateur avec cartes animées framer-motion (grille 3 colonnes)
- Chaque carte : image, badge statut, date, lieu, jauge remplissage, revenus, boutons action
- **Mini-menu de navigation rapide** : composant `OrganizerNav` avec cartes carrées (icônes orange, texte uppercase) intégré sur toutes les pages organisateur (/organizer, /organizer/event/{id}, /organizer/checkin/{id}). Adaptatif : 3 items sur le dashboard, 5 items sur les pages événement.
- **Formulaire de création modernisé** : Wizard multi-étapes (4 steps) avec barre de progression, sélection de sport par cartes visuelles, zone d'upload image drag & drop, animations framer-motion entre les étapes.
- **Page événement enrichie** :
  - Parcours OpenRunner intégré (iframe avec altimétrie + lien externe)
  - Adresse exacte avec carte Google Maps embarquée + bouton "Comment s'y rendre"
  - Règlement de la course (section dépliable)
  - Nom de l'organisateur affiché clairement
  - Compteur temps réel par épreuve/course avec barres de progression animées
- **Formulaire d'inscription modernisé** : Wizard 3 étapes (Informations personnelles, Course & Options, Licence & Paiement) avec :
  - Date de naissance Jour/Mois/Année séparés, pays, ville, code postal, email, téléphone, nationalité
  - Sélection d'épreuve par cartes, taille T-shirt (XS-2XL), contact urgence, nom de club
  - PPS avec vérification + lien athle.fr, licence FFA avec remise 3€, code promo
  - Email/téléphone pré-remplis depuis le compte, récapitulatif prix avec remises

## Comptes Test
| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Participant | sophie@test.com | test1234 |

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
