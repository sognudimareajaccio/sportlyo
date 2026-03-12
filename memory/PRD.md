# SportLyo - PRD (Product Requirements Document)

## Problème Original
Plateforme de vente de tickets en ligne pour des événements sportifs, nommée SportLyo.

## Architecture Technique
- **Frontend** : React, TailwindCSS, Shadcn UI, framer-motion, react-square-web-payments-sdk
- **Backend** : FastAPI (Python), email_service.py (Resend)
- **Database** : MongoDB
- **Auth** : JWT (Google OAuth retiré)
- **Paiements** : Square (production)
- **Emails** : Resend (en mode test, domaine sportlyo.com à vérifier)

## Fonctionnalités Implémentées

### Core (DONE)
- Auth JWT, CRUD événements, inscription multi-étapes wizard
- Paiement Square intégré (tokenisation carte côté frontend, traitement backend)
- Attribution automatique dossards, codes promo
- Chronométrage RFID, résultats temps réel, check-in QR code

### Emails Automatiques (DONE)
- Email de bienvenue à l'inscription
- Email de confirmation d'inscription avec détails (dossard, épreuve, montant, QR code)
- Email de notification à l'organisateur (nouvelle inscription + taux remplissage)
- Templates HTML chartés : #0f172a (bleu marine) + #ff4500 (orange) + logo SportLyo

### UI/UX (DONE)
- 44 défis sportifs en 7 groupes + CTA "Devenez Organisateur"
- Module recherche EventsPage refondu (glass-morphism, pilules catégories)
- Menu connecté modernisé (profil contextuel, animations framer-motion)
- Page Login/Register sans Google Auth
- Navbar simplifiée (Événements + Organisateurs)
- Scroll-to-top automatique
- Footer : "Conception Plateforme WEBISULA" + "Paiement sécurisé par SQUARE"
- Prix dynamique sidebar selon épreuve sélectionnée
- Plus aucun jaune (accent color → gris neutre)

## Comptes Test
| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
| Test | contact.sognudimare@gmail.com | test1234 |
| Test | webisula@gmail.com | test1234 |

## Tâches Restantes

### P0 - Email Domain
- Vérifier domaine sportlyo.com sur Resend pour envoyer depuis noreply@sportlyo.com

### P1 - Communication
- Gestion communautaire organisateur/participants
- Facturation automatique

### P2 - Avancé
- Contact organisateur/admin remboursements
- Location matériel RFID, fermeture auto inscriptions
- App mobile check-in, import CSV temps
- Stats avancées organisateurs, Twilio SMS

### Refactorisation
- Découpage backend/server.py en modules

## Intégrations
- Square (paiements production)
- Resend (emails transactionnels)
- fpdf2 (PDF), qrcode.react (QR), framer-motion, react-share
