# SportLyo - PRD (Product Requirements Document)

## Probleme Original
Plateforme de vente de tickets en ligne pour des evenements sportifs (marathon, trail, velo, etc.), nommee SportLyo.

## Architecture
- **Frontend:** React, TailwindCSS, Shadcn UI, framer-motion, recharts, date-fns
- **Backend:** FastAPI avec routeurs modulaires
- **Database:** MongoDB
- **Auth:** JWT
- **Paiements:** Square, SumUp
- **PDF:** fpdf2
- **SMS:** Twilio (graceful degradation)
- **Scraping:** BeautifulSoup4, Playwright

## Credentials de test
| Role | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Prestataire | boutique@sportlyo.fr | boutique123 |

## Ce qui est implemente

### Mars 2026 - Session 12 (P3 + Audit Pre-Production + Slideshow)

**7 fonctionnalites P3 finalisees et testees:**
- Facturation avancee (PDF branding organisateur)
- RFID Admin (CRUD equipements + gestion locations)
- Check-in Jour J (barre progression + UX mobile)
- SMS Templates (6 modeles + compteur destinataires)
- Statistiques avancees (filtres date + 3 graphiques recharts)
- Gestion communautaire (pagination + UX)
- Remboursements admin (filtres statut + notes admin)

**Slideshow interactif homepage:**
- 4 slides avec visuels generes (creation evenement, gestion inscriptions, check-in mobile, analytics)
- Fond anime asphalt avec cercles rotatifs + couleur accent par slide
- Navigation fleches + dots + auto-play 6s avec pause au survol
- CTA "Commencer gratuitement" avec sous-texte "Aucune carte bancaire requise"
- Composant: /app/frontend/src/components/PlatformSlideshow.js

**Audit pre-production COMPLET:**
- Securite: pas de secrets hardcodes, pas de fuite _id, auth protegee, CORS OK
- Backend: 100% endpoints fonctionnels (auth, events, admin, organizer, participant, provider, checkin, community, invoices, rfid, sms)
- Frontend: 100% regression (4 roles testes, tous dashboards, toutes pages)
- Seul warning non-critique: Recharts dimensions dans conteneurs collapses

### Sessions precedentes
- Session 11: Refactorisation OrganizerDashboard validee (16 sous-composants)
- Session 10: Refactorisation ProviderDashboard
- Session 9: Scaffolding 7 fonctionnalites P2
- Sessions 6-8: Gestion evenements, import catalogues, commissions admin

## Statut Production
- **PRET POUR DEPLOIEMENT** (audit pre-production passe le 14 mars 2026)
- **Twilio SMS MOCKED** : notifications sauvegardees en base, envoi reel en attente de configuration cles API

## Backlog restant
- [ ] Ameliorer onglet Commissions admin avec graphiques visuels
- [ ] Configurer cles Twilio pour envoi reel de SMS
- [ ] Export CSV des statistiques organisateur
- [ ] Paiement en ligne locations RFID
- [ ] Refactorisation supplementaire ProviderDashboard.js
