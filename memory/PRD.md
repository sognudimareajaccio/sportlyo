# SportLyo - PRD (Product Requirements Document)

## Problème Original
Créer une plateforme de vente de tickets en ligne pour des événements sportifs (marathon, trail, vélo, MMA, etc.), nommée SportLyo.

## Architecture
- **Frontend:** React + TailwindCSS + Shadcn UI + framer-motion + recharts
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Auth:** JWT
- **Paiement:** Square (intégré), SumUp (planifié)
- **Email:** Resend

## Rôles
- **Organisateurs:** Créent/gèrent événements, participants, promotions, suivi performances
- **Participants:** Inscription courses, gestion documents PPS, accès billets, boutique produits
- **Admin:** Supervision plateforme, utilisateurs, finances

## Ce qui est implémenté

### Authentification & Pages
- Login/Register avec fond animé glassmorphism
- JWT auth, rôles (admin, organizer, participant)
- Page Coming Soon avec accès preview

### Événements
- CRUD événements, courses multiples, jauges
- Page détail événement complète
- Inscription avancée multi-étapes
- Paiement Square intégré

### Hub Organisateur (complet)
- Dashboard centralisé avec grille navigation icônes
- Graphiques recharts (inscriptions, revenus)
- Sections : Événements, Participants, Jauges, Check-in (QR), Finances
- Correspondances (emails groupés/individuels)
- Chronométrage (import/export CSV)
- Partenaires CRM (CRUD complet)
- Sponsors & Donateurs CRM (CRUD complet)
- Boutique Produits Dérivés (CRUD, commissions, stock, images)
- Affichage commandes avec mode livraison, taille, couleur, adresse

### Messagerie
- Système messagerie directe organisateur/admin

### Admin Dashboard
- Cartes cliquables, onglet messagerie, gestion financière

### Boutique Participant (Mars 2026)
- Section discrète "Boutique officielle" sur la page événement
- Page dédiée `/events/{eventId}/shop` inspirée RunningHeroes
- Filtres par catégorie, grille responsive, breadcrumb navigation
- **Bouton "Commander"** sur chaque produit
- **Modal de commande complète** : choix taille, couleur, quantité
- **Mode de livraison** : Retrait sur place (gratuit) / Livraison à domicile (+5.90€)
- **Champs adresse** pour livraison domicile
- **Récapitulatif** avec frais de livraison et total
- **Commande confirmée** visible instantanément dans le dashboard organisateur
- Paiement SIMULÉ (SumUp à intégrer)

## Backlog Priorisé

### P0 - Critique
- Refactorisation `OrganizerDashboard.js` (3000+ lignes → composants)
- Refactorisation `server.py` (monolithe → APIRouter modulaires)

### P1 - Important
- Facturation automatique participants
- Intégration SumUp pour la boutique (remplacer paiement simulé)

### P2 - Futur
- Gestion communautaire organisateurs/participants
- Contact direct remboursement
- Plateforme location matériel RFID
- Fermeture automatique inscriptions
- App mobile check-in
- Statistiques avancées organisateurs
- Intégration Twilio SMS

## Credentials Test
| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@sportsconnect.fr | admin123 |
| Organisateur | club@paris-sport.fr | club123 |
| Participant | pierre@test.com | test1234 |
