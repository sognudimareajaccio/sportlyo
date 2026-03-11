# SportsConnect - Product Requirements Document

## Original Problem Statement
Plateforme de vente de tickets en ligne pour réserver des événements sportifs (marathons, trails, courses cyclistes, etc.) avec les thématiques: Cyclisme, Triathlon, Course à pied, Marche, Sports Mécaniques. 

**Fonctionnalités clés:**
- Organisateurs: créer/gérer événements avec caractéristiques (lieu, date, participants, tarifs, distances)
- Participants: réserver courses en ligne avec réception automatique de numéro de dossard
- Paiements centralisés avec commission plateforme (5%)
- Back-office admin pour contrôler et analyser la plateforme
- IA: chatbot assistant, recommandations personnalisées

**Inspiration:** https://new.sportsnconnect.com/

---

## Architecture

### Tech Stack
- **Backend:** FastAPI (Python)
- **Frontend:** React 19 + Tailwind CSS + Shadcn/UI
- **Database:** MongoDB
- **Authentication:** JWT + Emergent Google OAuth
- **AI:** OpenAI GPT-5.2 via Emergent LLM Key
- **Payments:** Square API (MOCKED)
- **Notifications:** SendGrid + Twilio (MOCKED)

### API Structure
```
/api/auth/register, /login, /me, /session, /logout
/api/events (CRUD), /events/featured, /events/{id}
/api/registrations (create, list, get)
/api/payments/process (MOCKED)
/api/chat (AI chatbot)
/api/recommendations
/api/categories
/api/admin/stats, /users, /payments
/api/organizer/events, /registrations/{event_id}
```

---

## User Personas

1. **Participant** - Sportifs amateurs/professionnels cherchant des événements
2. **Organisateur** - Clubs sportifs, associations, entreprises créant des événements  
3. **Admin** - Gestionnaire plateforme pour suivi commissions et utilisateurs

---

## What's Been Implemented (March 2026)

### MVP Features ✅
- [x] Landing page avec hero dynamique, catégories, événements en vedette
- [x] Catalogue d'événements avec filtres (sport, lieu, recherche)
- [x] Page détail événement avec inscription
- [x] Authentification JWT + Google OAuth
- [x] Dashboard participant (inscriptions, recommandations)
- [x] Dashboard organisateur (création événements, statistiques)
- [x] Dashboard admin (stats, gestion utilisateurs, paiements)
- [x] Génération automatique numéro de dossard
- [x] Chatbot IA "Coach AI" (GPT-5.2)
- [x] Commission plateforme 5%
- [x] Design moderne responsive (Barlow Condensed + Manrope)

### MOCKED (Requires API Keys)
- Square Payment API
- SendGrid Email notifications
- Twilio SMS notifications

---

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Intégration Square Payment réelle (clé API requise)
- [ ] Notifications email confirmation inscription

### P1 - High Priority
- [ ] Analyse parcours/dénivelé avec carte interactive (Leaflet)
- [ ] Export participants PDF pour organisateurs
- [ ] Analyse prédictive des ventes (IA)
- [ ] Filtres avancés par date et prix

### P2 - Medium Priority
- [ ] Notifications SMS (Twilio)
- [ ] Système de remboursement
- [ ] Liste d'attente événements complets
- [ ] Multi-langue (FR/EN)

### P3 - Nice to Have
- [ ] Application mobile (React Native)
- [ ] Intégration réseaux sociaux (partage)
- [ ] Badges/achievements participants
- [ ] Partenariats sponsors

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organizer | club@paris-sport.fr | club123 |

---

## Next Steps

1. Obtenir clé API Square pour paiements réels
2. Configurer SendGrid/Twilio pour notifications
3. Implémenter carte interactive parcours
4. Ajouter analyse prédictive ventes
