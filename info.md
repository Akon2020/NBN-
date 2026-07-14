# NBN Express Plus (Nyumbani Express Plus)

## 1. Présentation

**NBN Express** (Nyumbani Express) est une agence immobilière basée à **Bukavu, Sud-Kivu, RDC**. Slogan : *« Avec NBN Express, trouver devient simple »*.

Ses activités historiques (hors digital) :
1. Location de biens immobiliers
2. Location de maisons et parcelles
3. Conseils immobiliers
4. Accueil & déménagement

**NBN Express Plus** est le système digital interne en cours de construction pour digitaliser et industrialiser ces activités. Ce dépôt contient trois sous-projets :

| Dossier | Rôle | Stack |
|---|---|---|
| [Backend/](Backend) | API REST | Node.js, Express 5, Sequelize (MySQL), JWT |
| [Frontend/](Frontend) | Application web (dashboard interne) | Next.js 16, React 19, Tailwind, shadcn/Radix UI |
| [Mobile/](Mobile) | Application mobile | Expo / React Native (Expo Router) |

## 2. Vision du système

D'après le cahier des charges technique, l'objectif du système digital est de :

- Centraliser les données immobilières collectées sur le terrain
- Gérer les commissionnaires et les différents clients
- Permettre la consultation rapide des biens (moins de 24h)
- Donner un accès instantané aux informations, images et contacts

L'outil doit fonctionner comme **une base de données intelligente + un outil opérationnel terrain**, d'abord simple, mais structuré pour devenir à terme une plateforme immobilière majeure en Afrique, et particulièrement en RD Congo.

Contraintes techniques imposées par le contexte RDC (à respecter dans tous les choix techniques) :
- Application légère, fonctionnant avec une connexion faible
- Images optimisées
- Conception mobile first / responsive obligatoire

## 3. Organisation métier prévue (RBAC par service)

Le système est pensé pour être cloisonné par service : **chaque service ne voit que ce qui le concerne**, pour éviter désordre, erreurs et perte de contrôle.

**Acteurs internes**
- **Admin** — accès total, arbitrage des conflits, tableau de bord global
- **Service Communication** — contenus, galerie média, diffusion (WhatsApp, réseaux sociaux) — ne voit pas les commissions, données sensibles clients, contrats
- **Service Commercial**
  - *Marketing* — prospects entrants, sources, qualification initiale
  - *Opérations* — clients, biens, matching, visites, négociation, clôture — ne voit pas les données juridiques complètes ni les finances détaillées
- **Service Technologique** — utilisateurs, rôles/accès, logs, paramètres système, supervision BDD — ne gère pas les clients ni les transactions commerciales directement
- **Service Juridique** — contrats, vérification documents/titres fonciers, statut juridique des biens et bailleurs, litiges
- **Trésorerie** (+ Gestion financière interne) — transactions, commissions, dépenses, besoins internes, budget
- **Secrétariat** — accueil des demandes, agenda/visites, gestion des tâches et leur assignation, coordination inter-services
- **Commissionnaires** — apport de biens/clients, suivi de leurs apports, commissions (interface volontairement simple)

**Acteurs externes**
- Client : Locataire / Acheteur
- Fournisseur : Bailleur / Vendeur / Propriétaire / Gérant (avec un **espace client externe** en libre-service envisagé : inscription, ajout de biens, upload documents, signature digitale, validation sous 72h par l'agence)

> ⚠️ Cette segmentation par service est la cible du cahier des charges. Le code actuel n'implémente pour l'instant qu'un modèle de rôles simplifié (`admin` / `agent` / `consultant`), sans le cloisonnement fin par service décrit ci-dessus.

## 4. État d'avancement

Légende : ✅ **Fait** (codé et fonctionnel) · 🔨 **En construction** (code existant mais incomplet ou non branché) · 📋 **Spécifié** (détaillé dans le cahier des charges, développement non commencé) · 💡 **Envisagé** (vision/idée future, pas encore spécifiée en détail)

### Backend ([Backend/](Backend))

- ✅ Authentification complète : login / register / logout / reset password, JWT (cookie + header), middleware de vérification (`authMiddlware`) — [routes/auth.route.js](Backend/routes/auth.route.js), [middlewares/auth.middleware.js](Backend/middlewares/auth.middleware.js)
- ✅ Modèle de données complet pour l'immobilier : migrations et modèles pour `users`, `properties`, `rentalProperties`, `saleProperties`, `propertyImages`, `propertyPhones`, `favorites`, `proposals`, `propertyScores`, `activityLogs` — [migrations/](Backend/migrations), [models/](Backend/models)
- ✅ Documentation API via Swagger ([swagger.js](Backend/swagger.js))
- 🔨 Contrôleurs `property`, `favorite`, `proposal` écrits (CRUD, filtres par statut, images) mais **aucune route ne les expose encore** dans [app.js](Backend/app.js) (seuls `userRouter` et `authRouter` sont montés) — à finaliser en priorité pour que le frontend puisse consommer les vraies données
- 🔨 Rôles utilisateurs : seul un modèle simple `admin` / `agent` / `consultant` existe ; le RBAC détaillé par service (Communication, Marketing, Opérations, Juridique, Trésorerie, Secrétariat, Commissionnaire) reste à implémenter
- 📋 Scoring et grille d'évolution des commissionnaires (Junior / Confirmé / Senior, score /100, statuts Actif/Observation/Suspendu/Exclu)
- 📋 Workflow de validation des dépenses / réquisition de fonds (voir §6)
- 📋 Intégration WhatsApp (génération de message pré-rempli avec images/prix/localisation)
- 💡 Gestion des ressources humaines (personnel interne et externe)
- 💡 Gestion complète de caisse (encaissements + décaissements, soldes, états de sortie stylisés) — plus large que le seul workflow de réquisition de fonds déjà spécifié
- 💡 Rapports périodiques automatisés (journalier, hebdomadaire, mensuel, trimestriel, semestriel, annuel)
- 💡 Gestion de tâches façon kanban (assignation, attribution, temps restant)
- 💡 Notifications & alertes système transverses
- 💡 Paiement mobile (loyers, ventes, commissions, salaires)

### Frontend ([Frontend/](Frontend))

- ✅ Authentification connectée de bout en bout au vrai backend : login/register/forgot-password, token en cookie, `ProtectedRoute` — [actions/auth.ts](Frontend/actions/auth.ts), [components/ProtectedRoute.tsx](Frontend/components/ProtectedRoute.tsx)
- ✅ Dashboard scaffoldé avec pages et composants pour : ventes, locations, favoris, galerie, recherche, paramètres, utilisateurs — [app/dashboard/](Frontend/app/dashboard)
- 🔨 Les pages ventes/locations utilisent encore des **données mockées** (`lib/mock-data`) au lieu de l'API `properties` réelle — dépend du branchement des routes backend ci-dessus
- 📋 Fiches client/bailleur détaillées, scoring, pipeline commercial (Nouveau → Proposé → Visite → Négociation → Conclu/Perdu), intégration WhatsApp, interfaces dédiées par service (Communication, Marketing, Juridique, Trésorerie, Secrétariat), espace client externe self-service
- 💡 Interfaces RH, caisse complète, rapports périodiques, tâches kanban, notifications/alertes

### Mobile ([Mobile/](Mobile))

- 🔨 Le projet est encore le **squelette par défaut** généré par `create-expo-app` (onglets de démo, écran modal, composants d'exemple type `hello-wave`) — aucun développement métier n'a commencé
- 📋 Prévue pour deux usages avec comptes distincts (d'après les « Évolutions futures » du cahier des charges) :
  - Agents/employés : collecte terrain, tâches, suivi RH
  - Clients finaux : recherche et consultation de biens
- 💡 Fait partie de la vision « Application mobile » du cahier des charges, sans spécification détaillée à ce jour

## 5. Module Biens & Clients (le cœur opérationnel)

### Biens à louer — champs spécifiés
Type (appartement/maison), adresse (commune/quartier/avenue en listes prédéfinies), étage (optionnel), nombre de chambres/salons/toilettes/cuisines, prix, garantie, téléphones (min. 2), images (multi-upload), détails supplémentaires, **statut** (Disponible/Réservé/Loué), **source** (code commissionnaire ou informateur), date d'ajout.

### Biens à vendre — champs spécifiés (perspective d'évolution)
Type (appartement/maison/terrain), nature du terrain (durable/semi-durable/pente/plat), adresse complète, caractéristiques, prix de vente, **marge** (champ interne caché), contacts, images, statut, source, date d'ajout.

### Clients — segmentation
- **Demandeurs** : Locataire / Acheteur
- **Fournisseurs** : Bailleur / Vendeur
- Sous-types : Particulier / Entreprise / Diaspora / Investisseur

Le **bailleur est un client VIP** : fiche enrichie (identité, relation commerciale, biens associés, suivi relationnel avec fréquence de contact personnalisée, fiabilité, conditions spéciales, statut de relation, valeur du bailleur ⭐ à ⭐⭐⭐⭐).

Un **système de scoring** (clients et bailleurs) évalue budget clair, urgence, capacité de paiement, réactivité et historique pour prioriser les efforts commerciaux.

### Pipeline commercial
Nouveau client → Biens proposés → Visite programmée → Visite effectuée → Négociation → Transaction conclue / Perdu-abandonné.

### Matching
Association 1 client ↔ plusieurs biens, avec statuts En cours / Proposé / Validé.

## 6. Trésorerie & gestion de la caisse

Le document *« Feuille de route pour le workflow du système digital de validation des besoins »* décrit un **sous-ensemble** de la future gestion de caisse : l'automatisation du circuit de dépense, de la demande de matériel à la réquisition de fonds :

1. **Saisie** — le demandeur remplit un formulaire structuré (nature du besoin, quantité, coût estimé, justificatif)
2. **Vérification** — contrôle automatique des champs obligatoires et de la conformité budgétaire
3. **Approbation** — la trésorière valide, rejette (avec motif) ou demande un complément, via notification instantanée
4. **Génération** — émission automatique d'un document de Réquisition de Fonds (PDF) avec signature numérique / code de validation unique
5. **Archivage** — traçabilité complète (qui, quand, quel montant) et recherche par filtres pour audit

La **gestion de la caisse envisagée est plus large** que ce seul workflow : elle devra aussi couvrir les encaissements (loyers, ventes), un solde de caisse en temps réel, et des états de sortie stylisés au-delà de la seule réquisition de fonds.

## 7. Pilotage des commissionnaires

Chaque commissionnaire dispose d'une **fiche digitale dynamique** (identité, zone, code, niveau) avec :
- Performance calculée automatiquement (opportunités envoyées, taux d'exploitation, transactions, montant généré)
- Score global sur 100 points (performance, qualité, discipline, engagement)
- Grille d'évolution automatique : Junior → Confirmé → Senior (ex. score ≥ 75 + conditions → upgrade ; score < 60 → alerte)
- Catégories de classement : Élite (90-100), Très performant (75-89), Moyen (60-74), Risque (<60)
- Système d'incidents (retard > 30 min, données incomplètes, non-respect des règles) impactant le score discipline et le statut (Actif/Observation/Suspendu/Exclu)
- Écran de validation des missions terrain (collecte de bien, apport client, suivi) avec actions Valider/Rejeter/Demander correction

## 8. Autres modules spécifiés

- **Galerie intelligente** : navigation visuelle par bien, boutons Détails et Proposer
- **Intégration WhatsApp** : bouton « Proposer » qui génère automatiquement images + description + prix + localisation et ouvre WhatsApp avec un message prêt ; fonctionne par panier groupé (jusqu'à 6 biens, seuil modifiable)
- **Favoris & groupes** : sélection multiple de biens pour envoi groupé
- **Recherche & filtrage** : par commune/quartier/avenue, prix, type, nombre de chambres
- **Historique des modifications** sur chaque bien
- **Gestion des commissions** : association transaction ↔ agent, calcul commission agence/agent, statut de paiement
- **Tableau de bord** : nombre de biens, biens disponibles, clients actifs, performances agents, revenus, trésorerie, besoins internes
- **Règles métier globales** : aucun bien sans validation, aucun client sans données minimales, toute action est tracée et historisée, tout besoin interne doit être validé, chaque élément a un statut

## 9. Collecte terrain (MVP actuel)

En attendant le système digital, la collecte terrain se fait via des **Google Forms** (formulaire de demande de location, formulaire de collecte, version courte). Le cahier des charges prévoit explicitement que la structure de ces formulaires soit **identique** à celle de la base de données finale, pour permettre un import automatique lors de la migration vers le système digital.

## 10. Roadmap — évolutions envisagées à plus long terme

- Application mobile complète (agents + clients, comptes distincts)
- Plateforme publique **« NBN+ »**, dans l'esprit d'un « Airbnb africain »
- Paiement mobile (loyers, ventes, commissions, salaires)
- Système de notation
- Gestion des ressources humaines (personnel interne et externe à l'agence)
- Gestion de caisse complète (au-delà du seul workflow de réquisition de fonds)
- Rapports périodiques automatisés (J/H/M/T/S/A)
- Gestion de tâches façon kanban (assignation, temps restant)
- Notifications et alertes système transverses à tous les modules

## 11. Prochaines étapes techniques suggérées

1. Brancher les routes `property`, `favorite`, `proposal` dans le backend (les contrôleurs existent déjà)
2. Remplacer les données mockées du frontend (`lib/mock-data`) par des appels aux vraies API une fois branchées
3. Étendre le modèle de rôles (`admin`/`agent`/`consultant`) vers le RBAC détaillé par service décrit au §3
4. Démarrer la structuration du module Mobile au-delà du squelette Expo par défaut
