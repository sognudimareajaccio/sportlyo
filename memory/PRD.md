# SportLyo - Product Requirements Document

## Original Problem Statement
Plateforme de vente de tickets en ligne pour réserver des événements sportifs (marathons, trails, courses cyclistes, etc.) avec les thématiques: Cyclisme, Triathlon, Course à pied, Marche, Sports Mécaniques. Nommée **SportLyo**.

**Fonctionnalités clés demandées:**
- Inscriptions avancées (quotas, tarifs évolutifs, équipes/relais, vagues)
- Gestion participants (validation documents, PPS, dossards, RFID)
- Paiements sécurisés (Stripe, 5% commission ajoutée, codes promo, remboursements)
- Communication (emails, billets digitaux, QR code)
- Chronométrage et résultats en temps réel
- Back-office admin complet
- Accès privé via clé SPORTLYO2026

---

## Architecture

### Tech Stack
- **Backend:** FastAPI (Python)
- **Frontend:** React 19 + Tailwind CSS + Shadcn/UI
- **Database:** MongoDB
- **Authentication:** JWT + Emergent Google OAuth
- **AI:** OpenAI GPT-5.2 via Emergent LLM Key
- **Payments:** Stripe (5% commission ajoutée)
- **PDF Generation:** fpdf2
- **QR Code:** qrcode library

---

## User Personas

1. **Participant** - Sportifs cherchant des événements, utilisant le chrono personnel
2. **Organisateur** - Clubs/associations créant événements avec options avancées
3. **Admin** - Gestionnaire plateforme, suivi commissions et utilisateurs

---

## What's Been Implemented

### Phase 1 - MVP
- [x] Landing page avec hero dynamique, catégories, événements
- [x] Catalogue d'événements avec filtres
- [x] Page détail événement
- [x] Authentification JWT + Google OAuth
- [x] Dashboard participant et organisateur
- [x] Back-office admin
- [x] Chatbot IA "Coach AI"

### Phase 2 - Fonctionnalités Avancées
- [x] Inscriptions avancées (quotas, tarifs, vagues, options, restrictions d'âge, équipes)
- [x] Gestion participants (PPS - MOCKED, transfert dossards, liste d'attente, QR Code)
- [x] Paiements Stripe (5% commission, codes promo, remboursements)
- [x] Chronométrage manuel participant (start/stop, résultats live, classement)
- [x] Communication (billet digital QR code)

### Phase 2.1 - Modification d'événements
- [x] Modale d'édition complète avec multi-épreuves/distances

### Phase 2.2 - Rebranding SportLyo
- [x] Renommage SportsConnect → SportLyo
- [x] Page Coming Soon avec accès privé (SPORTLYO2026)
- [x] Calendrier français personnalisé (Shadcn)
- [x] Exports financiers CSV/PDF (admin + organisateur)
- [x] Modèle commission 5% ajouté (participant paie)

### Phase 2.3 - Inscriptions avancées + Logos (March 12, 2026)
- [x] Formulaire d'inscription avec prénom, nom, sexe, date de naissance
- [x] Calcul automatique catégorie d'âge
- [x] Attribution dossard + puce RFID simulée
- [x] Logos SportLyo officiels intégrés (dark pour fond clair, light pour fond sombre)
- [x] Suppression routes backend dupliquées (checkin/scan, checkin/stats)

### Phase 2.4 - Chronométrage Frontend (March 12, 2026)
- [x] Page Check-in dédiée (/organizer/checkin/:eventId)
  - Stats temps réel (inscrits, pointés, restants)
  - Barre de progression
  - Scanner QR code / saisie dossard
  - Historique check-ins récents
- [x] Bouton export CSV chronométrage sur dashboard organisateur
- [x] Bouton check-in (Scan) sur dashboard organisateur
- [x] Bouton résultats sur dashboard organisateur
- [x] Page Résultats améliorée
  - Filtre par catégorie d'âge
  - Colonne catégorie avec rang catégorie
  - Stats H/F
  - Auto-refresh 10s

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

### P0 - Communication (Next)
- [ ] Emails automatiques Resend (confirmation inscription + QR code)
- [ ] Notifications SMS Twilio

### P1 - Production Ready
- [ ] Fermeture automatique inscriptions (quota/date)
- [ ] Vérification PPS réelle avec API FFA
- [ ] Import CSV de temps (chronométreurs externes)
- [ ] Refactoring backend (server.py → modules)

### P2 - Medium Priority
- [ ] Carte interactive parcours (Leaflet/Mapbox)
- [ ] Analyse prédictive des ventes (IA)
- [ ] Multi-langue (FR/EN)
- [ ] Upload/validation certificat médical

### P3 - Nice to Have
- [ ] Application mobile check-in
- [ ] Partage réseaux sociaux
- [ ] Badges/achievements
- [ ] Statistiques avancées (répartition H/F, performances)

---

## Notes Techniques
- **Commission:** 5% ajouté au prix de base, payé par le participant
- **PPS:** Pass Prévention Santé FFA - simulé (MOCKED)
- **RFID:** Endpoint /api/rfid-read simulé (MOCKED)
- **Logos:** logo-dark.png (fond clair), logo-light.png (fond sombre)
- **Accès privé:** ?preview=SPORTLYO2026 ou clé dans formulaire
