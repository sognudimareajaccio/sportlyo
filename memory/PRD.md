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

### Mars 2026 - Session 14 (Benevoles + UI)

**Widget Gestion des Benevoles (P0) - COMPLETE:**
- CRUD complet backend (GET/POST/PUT/DELETE) dans /api/organizer/volunteers
- 10 fonctions predefinies: Ravitaillement, Signaleur, Accueil, Chronometrage, Securite, Logistique, Animation, Medical, Transport, Communication
- Tableau avec colonnes: Nom, Prenom, Fonction, Evenement, Telephone, Email, Actions
- Dialog ajout/modification avec validation champs obligatoires
- Filtre par evenement + barre de recherche
- Liens cliquables telephone (tel:) et email (mailto:)

**Commission 5% plateforme sur liens de paiement (P0) - COMPLETE:**
- Frais de fonctionnement plateforme 5% ajoutes automatiquement au montant du lien de paiement
- 2 lignes dans la commande Square : montant du don + frais plateforme
- Decomposition affichee sur la fiche sponsor : Montant / Frais 5% / Total facture
- Commission enregistree dans la collection 'commissions' (pending → collected)
- S'applique aux sponsors ET donateurs

**Recu fiscal Cerfa 11580 automatique (P0) - COMPLETE:**
- Genere automatiquement lors de la confirmation de paiement
- PDF conforme Cerfa : organisme beneficiaire, donateur, montant, cadre fiscal (articles 200/238 bis CGI)
- Montant en toutes lettres, numero de recu unique
- Telechargeable depuis la fiche sponsor
- Notification email au donateur via Resend
- 3 etats visuels : "Generer lien" → "Confirmer paiement" / "Copier lien" → "Telecharger recu fiscal" / "Paye"

**Dashboard Finances & Revenus Organisateur (P0) - COMPLETE:**
- Endpoint GET /api/organizer/revenue-breakdown avec 5 sources dissociees
- Sources: Inscriptions, Dons, Sponsors & Mecenes, Produits derives, Reservations entreprises
- Chaque source affiche: total, frais plateforme, net, nombre de transactions, en attente
- Banner: CA total, Frais plateforme (5%), Revenu net + boutons CSV/PDF
- Graphique AreaChart evolution 12 mois (5 courbes colorees)
- Camembert repartition des revenus
- BarChart revenus mensuels totaux
- Tableau detail par evenement (inscrits, prix, brut, frais, net)
- Tableau dernieres transactions toutes sources (avec badges colores par type)

**Ameliorations UI:**
- Boutons Publier/Depublier: rond vert clignotant (en ligne) + rond rouge fixe (brouillon)
- Badges statut: "EN LIGNE" avec animation ping verte, "BROUILLON" avec point rouge
- Slide Boutique: "Boutique zero stock" → "Boutique personnalisee"
- Slide Boutique: textes bullet points mis a jour
- Slide Paiement: "Stripe" → "Square" + icones CB Visa/Mastercard/AmEx

### Mars 2026 - Session 13 (Dotation participant + N inscrit)

**Dotation participant (P0) - COMPLETE:**
- Champ `provided_items: List[str]` ajoute au modele EventCreate et endpoint POST /api/events
- 9 articles predefinis: T-shirt, Medaille, Sac, Casquette, Gourde, Dossard, Serviette, Ravitaillement, Photo souvenir
- Possibilite d'ajouter des articles personnalises
- Interface dans formulaires Creation et Edition d'evenements
- Affichage des dotations sur la page de detail evenement
- Selecteur taille T-shirt conditionnel (apparait uniquement si 'tshirt' dans provided_items)

**Renommage N de dossard → N d'inscrit (P0) - COMPLETE:**
- "N de dossard" renomme en "N d'inscrit" dans tous les contextes participant (inscription, mes inscriptions, timer)
- "Dossard" conserve dans les contextes jour de course (check-in, chronometrage, resultats)

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
- 4 slides avec visuels generes
- Navigation fleches + dots + auto-play 6s
- CTA "Commencer gratuitement"

**Audit pre-production COMPLET:**
- Securite, Backend, Frontend: 100% fonctionnel

### Sessions precedentes
- Session 11: Refactorisation OrganizerDashboard validee (16 sous-composants)
- Session 10: Refactorisation ProviderDashboard
- Session 9: Scaffolding 7 fonctionnalites P2
- Sessions 6-8: Gestion evenements, import catalogues, commissions admin

## Statut Production
- **PRET POUR DEPLOIEMENT** (audit pre-production passe le 14 mars 2026)
- **Twilio SMS MOCKED** : notifications sauvegardees en base, envoi reel en attente de configuration cles API

## Backlog restant
- [ ] (P1) Mode Demo avec bouton "Essayer gratuitement" sur la page d'accueil
- [ ] (P2) Ameliorer onglet Commissions admin avec graphiques visuels
- [ ] (P2) Configurer cles Twilio pour envoi reel de SMS
- [ ] (P2) Export CSV des statistiques organisateur
- [ ] (P2) Paiement en ligne locations RFID
- [ ] (P2) Refactorisation supplementaire ProviderDashboard.js
