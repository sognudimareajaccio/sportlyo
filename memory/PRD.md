# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour des événements sportifs (marathon, trail, vélo, etc.), nommée SportLyo.

## Architecture
- **Frontend:** React, TailwindCSS, Shadcn UI, framer-motion, recharts
- **Backend:** FastAPI avec routeurs modulaires
- **Database:** MongoDB
- **Auth:** JWT
- **Paiements:** Square, SumUp (INTÉGRÉ)
- **Email:** Resend
- **PDF:** fpdf2, PyMuPDF

## Credentials de test
| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Prestataire | boutique@sportlyo.fr | boutique123 |

## Ce qui est implémenté

### Mars 2026 - Session 5 (Actuelle)
- **PDF 600MB** : Limite portée à 600MB, progression page par page en temps réel
- **Fiches produits portrait** : Cartes en format 3:4 adapté vêtements, design modernisé
- **Galerie multi-photos** : Jusqu'à 10 photos par produit, carrousel avec flèches et dots, upload multiple, badge "X photos"

### Mars 2026 - Session 4
- **Fix Upload PDF TopTex** : Background task + streaming chunks
- **Fix Image lookup TopTex** : Extraction og:image
- **Partage événement** : Modal animé Facebook/X/WhatsApp/Email + copier lien
- **Commission non modifiable** par organisateur (imposée prestataire)
- **Suppression "Devenir Organisateur"** pour non-organisateurs
- **Produits prestataire verrouillés** pour organisateur (badge + Lock)

### Mars 2026 - Sessions 1-3
- Refactorisation backend (routeurs modulaires)
- Dashboard Participant (7 widgets)
- Dashboard Prestataire (finances, ventes)
- Intégration SumUp
- Notifications temps réel
- Messagerie participant-prestataire
- Seeding données auto

## Backlog Priorisé

### P1 (Moyenne priorité)
- [ ] Système de facturation avancé
- [ ] Refactorisation frontend OrganizerDashboard.js

### P2 (Future)
- [ ] Gestion communautaire
- [ ] Contact direct remboursements
- [ ] Location matériel RFID
- [ ] App mobile check-in
- [ ] Statistiques avancées organisateurs
- [ ] Notifications SMS (Twilio)

## Intégrations Tierces
| Service | Statut |
|---------|--------|
| Square | Intégré |
| SumUp | INTÉGRÉ |
| Resend | Intégré |
| fpdf2 | Intégré |
| TopTex | INTÉGRÉ (PDF 600MB + lookup) |
