# SportLyo - Product Requirements Document

## Original Problem Statement
Plateforme de vente de tickets en ligne pour réserver des événements sportifs (marathons, trails, courses cyclistes, etc.) avec les thématiques: Cyclisme, Triathlon, Course à pied, Marche, Sports Mécaniques. Nommée **SportLyo**.

---

## Architecture

### Tech Stack
- **Backend:** FastAPI (Python)
- **Frontend:** React 19 + Tailwind CSS + Shadcn/UI
- **Database:** MongoDB
- **Authentication:** JWT + Emergent Google OAuth
- **Payments:** Stripe (5% commission ajoutée, payée par le participant)
- **PDF Generation:** fpdf2
- **QR Code:** qrcode library

---

## What's Been Implemented

### Phase 1 - MVP
- [x] Landing page avec hero dynamique, catégories, événements
- [x] Catalogue d'événements avec filtres
- [x] Page détail événement avec partage réseaux sociaux
- [x] Authentification JWT + Google OAuth
- [x] Dashboard participant et organisateur
- [x] Back-office admin

### Phase 2 - Fonctionnalités Avancées
- [x] Inscriptions avancées (quotas, tarifs, vagues, options, restrictions d'âge, équipes)
- [x] Formulaire inscription avec prénom, nom, sexe, date de naissance
- [x] Gestion participants (dossards, RFID simulé, QR Code, check-in)
- [x] Paiements Stripe (5% commission, codes promo, remboursements)
- [x] Chronométrage (API RFID, résultats live, classements par catégorie)
- [x] Communication (billet digital QR code)

### Phase 2.5 - Dashboard Organisateur Enrichi (March 12, 2026)
- [x] **Page gestion événement** (/organizer/event/:eventId)
  - Stats : Inscrits, Places restantes, Taux de remplissage (%), Revenus, Payés
  - Jauge de remplissage visuelle (globale + par épreuve)
  - Auto-refresh toutes les 15s
- [x] **Liste inscrits en temps réel**
  - Table complète (dossard, participant, email, épreuve, catégorie, statut, check-in, prix)
  - Filtres : recherche texte, épreuve, catégorie d'âge, statut de paiement
  - Export CSV
- [x] **Ajout manuel de participants** (sans paiement, avec dossard/RFID/QR auto-générés)
- [x] **Gestion codes promo** (CRUD complet)
  - Création : code, type (% ou fixe), valeur, max utilisations, date expiration
  - Suppression
- [x] **Partage réseaux sociaux** (Facebook, Twitter/X, WhatsApp, LinkedIn, copie lien)
  - Sur page événement publique (dropdown hover)
  - Sur page organisateur (boutons dédiés)
- [x] **Intégration chronométrage** (infos endpoint RFID, compatibilité RaceResult/Chronotrack/MyLaps/Webscorer)
- [x] **Contact admin** (formulaire demande remboursement/question technique)
- [x] **Messages admin** (endpoint GET /api/admin/messages)
- [x] **Logos SportLyo** officiels intégrés

### Exports
- [x] CSV/PDF financiers admin et organisateur
- [x] CSV chronométrage (liste inscrits pour logiciel chrono)

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organizer | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Participant | sophie@test.com | test1234 |

---

## Prioritized Backlog

### P1 - Communication & Production
- [ ] Emails automatiques Resend (confirmation inscription + QR code)
- [ ] Notifications SMS Twilio
- [ ] Fermeture automatique inscriptions (quota/date)
- [ ] Factures automatiques PDF pour participants/groupes
- [ ] Gestion catégories personnalisables (âge, distances)

### P1.5 - Connexion Logiciels Chronométrage
- [ ] Configuration UI webhook pour RaceResult/Chronotrack/MyLaps/Webscorer
- [ ] Import CSV de temps (chronométreurs externes)
- [ ] Location RFID sur plateforme

### P2 - Communauté & Avancé
- [ ] Communauté par organisation (messages, annonces)
- [ ] Validation arrivées live (interface temps réel pendant course)
- [ ] Vérification PPS réelle avec API FFA
- [ ] Refactoring backend (server.py → modules séparés)

### P3 - Nice to Have
- [ ] Carte interactive parcours (Leaflet/Mapbox)
- [ ] Application mobile check-in
- [ ] Multi-langue (FR/EN)
- [ ] Statistiques avancées (répartition H/F, performances)

---

## Notes Techniques
- **Commission:** 5% ajouté au prix de base, payé par le participant
- **PPS:** Pass Prévention Santé FFA - simulé (MOCKED)
- **RFID:** Endpoint /api/rfid-read simulé (MOCKED)
- **Logos:** logo-dark.png (fond clair), logo-light.png (fond sombre)
- **Accès privé:** ?preview=SPORTLYO2026
