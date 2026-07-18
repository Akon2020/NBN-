# plan.md — NBN Express Plus — Plan de développement complet

Ce plan couvre l'ensemble du système (Backend, Admin Web, Mobile) sur les milestones M0 à M7. Il s'appuie sur les décisions figées dans `CLAUDE.md` — toute divergence doit d'abord être actée là-bas.

Convention d'identifiants : `ARCH-G##` (architecture transversale), `SEC-G##` (sécurité), `BACK-G##` (Backend), `ADMIN-G##` (Frontend Admin), `MOBILE-G##` (Mobile), `QA-G##` (tests/qualité), `DEVOPS-G##` (infra/déploiement), `DESIGN-G##` (design system), `DOC-G##` (documentation).

---

## Goals globaux du système

1. Éliminer les failles de sécurité et incohérences identifiées dans le code réel avant tout nouveau développement métier.
2. Établir une fondation Identity/Authorization/Organization robuste et réutilisable par tous les domaines métier.
3. Livrer le cœur métier immobilier + CRM conforme au cahier des charges, avec RBAC par service.
4. Étendre le système aux domaines validés hors cahier des charges (Field Ops, Treasury, Payments, Tasks, Notifications, Calendar, Reporting, RH) sans dette architecturale ajoutée.
5. Livrer une application mobile réellement offline-first pour la collecte terrain, avec une identité visuelle NBN cohérente (NativeWind).
6. Permettre aux trois workstreams (Backend, Admin Web, Mobile) d'avancer en parallèle à partir de contrats Swagger validés, sans blocage séquentiel artificiel.

---

## Vue d'ensemble des dépendances entre domaines

```
Identity ─┬─→ Authorization ─┬─→ [tous les modules métier — prérequis transversal]
          │                   │
          └─→ Organization ───┘
                  │
                  ├──→ Real Estate ──→ CRM ──→ Field Ops
                  │                              │
                  ├──→ Treasury ──→ Payments      │
                  │        ↑                      │
                  └────────┴──── Commissions ←────┘

Tasks, Notifications/Alerts/Reminders, Calendar, Reporting, Audit
  → dépendent d'Identity+Authorization uniquement, se développent en parallèle
    des modules métier au fur et à mesure que les entités qu'ils annotent existent

Realtime → dépend d'Authorization (audiences calculées) + Notifications (source des événements)
Files → transversal, utilisé par Real Estate, CRM, Field Ops, Treasury, RH
```

---

## Principe de parallélisation des trois workstreams

Dès qu'un **contrat Swagger** est validé pour un domaine (schéma de requête/réponse, codes d'erreur, permissions requises), Admin Web et Mobile construisent contre un **mock conforme au contrat** sans attendre l'implémentation réelle du Backend. Le contrat Swagger est la seule source de vérité inter-projets (voir `CLAUDE.md` §9 — pas de package partagé).

Chaque milestone ci-dessous liste explicitement ce que chaque workstream peut faire **en parallèle**, pas seulement en séquence.

---

# MILESTONE 0 — Sécurisation et stabilisation des fondations existantes

**Objectif** : corriger tous les problèmes identifiés à l'audit du code réel avant tout nouveau développement métier. Aucun domaine métier neuf ne démarre avant que M0 soit clôturé pour le Backend.

### SEC-G01 — Corriger l'authentification par cookie

- **Tâches** : aligner le nom de cookie entre `auth.controller.js` (pose `token`) et `auth.middleware.js` (lisait `loginToken`) ; enregistrer `cookie-parser` dans `app.js`.
- **Dépendances** : aucune.
- **Critères d'acceptation** : une requête authentifiée uniquement par cookie (sans header `Authorization`) réussit sur un endpoint protégé.
- **Tests** : test d'intégration `supertest` couvrant login → requête protégée via cookie seul.
- **Définition de terminé** : test passant en CI.

### SEC-G02 — Introduire un contrôle de rôle minimal sur les routes utilisateurs

- **Tâches** : ajouter un middleware `requireRole`/`requirePermission` (version minimale, avant le RBAC complet de M1) sur `/api/users/add`, `/update/:id`, `/delete/:id` — accès restreint à `admin` en attendant le RBAC détaillé.
- **Dépendances** : aucune (précède M1, c'est un correctif d'urgence, pas le RBAC final).
- **Critères d'acceptation** : un utilisateur non-admin reçoit 403 sur ces trois routes.
- **Tests** : cas positif (admin autorisé) + cas négatif (agent refusé) en `supertest`.

### SEC-G03 — Vérification du statut utilisateur à l'authentification

- **Tâches** : `authMiddlware` doit rejeter un utilisateur dont `status = INACTIVE`.
- **Dépendances** : aucune.
- **Critères d'acceptation** : un compte désactivé avec un token encore valide reçoit 401 sur toute requête protégée.

### SEC-G04 — Corriger les bugs de `property.controller.js`

- **Tâches** : retirer/corriger `getPropertiesByStatut` (champ `statut` inexistant — à recréer proprement en M2 avec le vrai champ) ; corriger les alias d'association Sequelize (`as: "scores"` sans association nommée correspondante) ; corriger `deleteProperty` (FK `propertyId` → `idProperty`).
- **Dépendances** : aucune.
- **Critères d'acceptation** : suppression d'un bien supprime effectivement ses images/téléphones/scores associés (vérifié par requête post-suppression).

### SEC-G05 — Rotation des secrets et configuration

- **Tâches** : retirer les identifiants en clair de `config/config.json` (notamment `root`/`root` en `production`), migrer vers variables d'environnement, considérer tout secret déjà commité comme compromis et le faire tourner (mot de passe DB, `JWT_SECRET`, identifiants SMTP).
- **Dépendances** : aucune.
- **Critères d'acceptation** : `config/config.json` ne contient plus aucun secret en clair ; les anciens secrets ne sont plus valides.

### SEC-G06 — Restrictions d'upload

- **Tâches** : ajouter une whitelist de types MIME et une limite de taille propre à `multer` (indépendante de la limite globale `body-parser`).
- **Critères d'acceptation** : un upload de type non autorisé ou dépassant la taille limite est rejeté avec une erreur claire.

### SEC-G07 — Activer `helmet` et le rate limiting

- **Tâches** : activer `helmet` dans `app.js` ; ajouter `express-rate-limit` sur `/api/auth/login` et `/api/auth/register` au minimum.
- **Critères d'acceptation** : en-têtes de sécurité HTTP présents sur les réponses ; un nombre excessif de tentatives de login sur une courte période reçoit 429.

### ADMIN-G01 — Brancher le garde de rôle Frontend et corriger la configuration Next.js

- **Tâches** : décommenter `ProtectedRoute` dans `dashboard/layout.tsx` ; retirer `ignoreBuildErrors: true` et `images: { unoptimized: true }` de `next.config.mjs`, corriger les erreurs TypeScript ainsi révélées ; unifier la gestion du cookie `token` (supprimer la double gestion httpOnly serveur + js-cookie client, choisir httpOnly serveur comme source unique — le Frontend lit l'état d'auth via `/api/auth/profile`, pas via lecture directe du cookie).
- **Dépendances** : SEC-G01 (cookie fonctionnel).
- **Critères d'acceptation** : le build Next.js échoue si une vraie erreur TypeScript est introduite ; les images sont optimisées ; un utilisateur non autorisé par rôle est bloqué côté client (en plus du blocage Backend, jamais à sa place).

### MOBILE-G01 — Structure de navigation par rôle (squelette)

- **Tâches** : poser la structure Expo Router permettant une navigation différenciée par profil (commissionnaire/agent terrain, client final, interne) sans encore de logique métier réelle — pur squelette de navigation conditionnelle.
- **Dépendances** : aucune (peut démarrer immédiatement, en parallèle de tout M0 Backend).
- **Critères d'acceptation** : trois arborescences de navigation distinctes existent et sont sélectionnables (via un mock de rôle en dur pour l'instant).

### DESIGN-G01 — Intégrer les tokens de design system

- **Tâches** : déclarer les tokens de couleur (`CLAUDE.md` §10) dans le thème Tailwind du Frontend et dans `tailwind.config.js` NativeWind du Mobile ; installer NativeWind selon la procédure documentée dans `CLAUDE.md` §12.
- **Dépendances** : aucune.
- **Critères d'acceptation** : les mêmes noms de tokens sont utilisables des deux côtés (ex. `bg-primary-900`, `text-accent-600`).

### QA-G01 — Mise en place de l'outillage de test

- **Tâches** : installer et configurer `vitest`+`supertest` (Backend), `vitest`+`@testing-library/react` (Frontend), `jest`+`@testing-library/react-native` (Mobile) ; CI GitHub Actions basique (lint + test) sur les trois projets.
- **Critères d'acceptation** : un test trivial passe en CI sur chacun des trois projets.

**Parallélisation M0** : SEC-G01 à SEC-G07 (Backend) sont indépendants entre eux et parallélisables. ADMIN-G01 dépend de SEC-G01 uniquement pour son critère d'acceptation final, mais le retrait de `ignoreBuildErrors`/`images.unoptimized` peut démarrer immédiatement. MOBILE-G01 et DESIGN-G01 sont totalement indépendants du Backend et démarrent immédiatement.

---

# MILESTONE 1 — Identity, Authorization, Organization

**Objectif** : fondations dont tout le reste du système dépend.

### BACK-G01 — Access Token / Refresh Token / Session

- **Tâches** : implémenter l'entité `Session` (`CLAUDE.md` §5), rotation des refresh tokens, détection de réutilisation, endpoints `/refresh`, `/logout`, `/logout-all`, `User.securityVersion` + cache in-process de révocation.
- **Dépendances** : M0 clôturé (base d'auth stabilisée).
- **Critères d'acceptation** : un refresh token révoqué et réutilisé déclenche la révocation de toute la famille de tokens ; une suspension de compte invalide l'accès en moins de 60 secondes même avec un access token encore valide.
- **Tests** : scénario complet rotation + réutilisation + suspension en `supertest`.

### BACK-G02 — RBAC (Role, Permission, AccessGrant)

- **Tâches** : modèles `Role`, `Permission`, `RolePermission`, `AccessGrant` ; migration de l'ENUM `User.role` actuel vers le nouveau système (base de dev jetable — pas de migration de données historiques à préserver) ; middleware `requirePermission` générique remplaçant le correctif temporaire SEC-G02 ; rôles initiaux : Admin, Communication, Marketing, Opérations, Technologique, Juridique, Trésorerie, Commissionnaire, Consultant (zéro permission de base).
- **Dépendances** : BACK-G01 (le token doit porter les informations nécessaires à l'évaluation des permissions).
- **Critères d'acceptation** : chaque rôle du cahier des charges a son set de permissions par défaut conforme au tableau §3 du CDC (ce que chaque service voit/ne voit pas) ; un `consultant` fraîchement créé n'a accès à rien tant qu'aucun `AccessGrant` ne lui est accordé.

### BACK-G03 — Field-level authorization (sérialisation centralisée)

- **Tâches** : couche de serializer par ressource consultant les permissions effectives avant construction de la réponse JSON ; appliqué en premier lieu à `Property.margin`.
- **Dépendances** : BACK-G02.
- **Critères d'acceptation** : un rôle sans la permission `property:margin:read` ne reçoit jamais ce champ dans la réponse API, quelle que soit la route utilisée.

### BACK-G04 — Organization (Person, EmployeeProfile, User)

- **Tâches** : modèle `Person` central, `EmployeeProfile` avec `userId` nullable, `Service`/`Département`, `Poste`, lien hiérarchique (responsable).
- **Dépendances** : BACK-G02 (les employés ont un rôle de sécurité optionnel via `User`).
- **Critères d'acceptation** : un `EmployeeProfile` peut être créé sans `User` associé ; un `User` `consultant` existe sans être un `EmployeeProfile`.

### ADMIN-G02 — Écrans de gestion des rôles/permissions (contre mock puis réel)

- **Tâches** : développer contre un mock conforme au contrat Swagger dès qu'il est publié par BACK-G02 ; brancher sur l'API réelle dès qu'elle est disponible.
- **Dépendances** : contrat Swagger de BACK-G02 (pas l'implémentation complète).
- **Critères d'acceptation** : un admin peut créer un `AccessGrant` pour un consultant depuis l'interface, avec `reason` obligatoire.

### MOBILE-G02 — Flux de login et stockage sécurisé des tokens

- **Tâches** : implémenter le login contre le contrat Swagger (mock puis réel), stockage via `expo-secure-store`.
- **Dépendances** : contrat Swagger de BACK-G01.
- **Critères d'acceptation** : le refresh token n'est jamais lisible en clair par une inspection du stockage de l'appareil (Keychain/Keystore).

### QA-G02 — Tests RBAC

- **Tâches** : matrice de tests couvrant chaque rôle × chaque ressource sensible (accès attendu vs refusé), conforme au tableau du CDC §3.
- **Dépendances** : BACK-G02, BACK-G03.

**Parallélisation M1** : ADMIN-G02 et MOBILE-G02 démarrent dès la publication du contrat Swagger de BACK-G01/BACK-G02, sans attendre l'implémentation complète. BACK-G04 peut être développé en parallèle de BACK-G03 (pas de dépendance directe entre eux).

---

# MILESTONE 2 — Real Estate (fondations) + CRM (fondations)

**Objectif** : cœur métier immobilier conforme au CDC, remplacement des données mockées.

### BACK-G05 — Compléter le modèle `Property`

- **Tâches** : ajouter `statut` (Disponible/Réservé/Loué — ENUM, remplace l'usage erroné actuel), `source`/`codeCommissionnaire`, vérifier `assignedTo` (préparé mais inerte, cf. `CLAUDE.md` §5 règles contextuelles).
- **Dépendances** : M1 clôturé (RBAC nécessaire pour protéger `margin` déjà en place).
- **Critères d'acceptation** : les trois statuts CDC sont représentés et filtrable via une route dédiée fonctionnelle (corrige définitivement SEC-G04).

### BACK-G06 — Modèles `Client` et `Bailleur`

- **Tâches** : créer les tables `Client`/`Bailleur` (actuellement totalement absentes), segmentation (Demandeur/Fournisseur, Particulier/Entreprise/Diaspora/Investisseur), fiche bailleur enrichie (relation commerciale, biens associés, suivi relationnel, fiabilité, valeur), système de scoring (champs calculés ou stockés selon décision d'implémentation).
- **Dépendances** : M1 (RBAC pour protéger les données financières/sensibles des fiches client/bailleur).
- **Critères d'acceptation** : une fiche bailleur complète correspond aux champs du CDC §3 (module 3) ; le champ scoring est accessible selon permissions.

### BACK-G07 — Brancher les routes `property`/`favorite`/`proposal`

- **Tâches** : monter les routes existantes mais non exposées, compléter `favorite.controller.js`/`proposal.controller.js` (actuellement vides), lier `Proposal` à un `Client` réel (actuellement les champs client sont commentés dans le modèle).
- **Dépendances** : BACK-G05, BACK-G06.
- **Critères d'acceptation** : le Frontend peut consommer des données réelles pour ventes/locations/favoris.

### BACK-G08 — Pipeline commercial et matching

- **Tâches** : statuts du pipeline (Nouveau → Proposé → Visite programmée → Visite effectuée → Négociation → Conclu/Perdu), module de matching (1 client ↔ plusieurs biens, statuts En cours/Proposé/Validé).
- **Dépendances** : BACK-G06.

### ADMIN-G03 — Remplacer les données mockées

- **Tâches** : remplacer `lib/mock-data.ts` par de vrais appels API dans les 7 pages concernées (ventes, locations, favoris, galerie, recherche + leurs pages `[id]`) ; développer `actions/users.ts` (actuellement vide malgré les modales existantes).
- **Dépendances** : contrat Swagger de BACK-G07 (mock d'abord, réel ensuite).

### ADMIN-G04 — Fiches client/bailleur et pipeline commercial

- **Tâches** : interfaces dédiées par service selon le cloisonnement RBAC (Communication ne voit pas les commissions, Opérations ne voit pas les finances détaillées, etc. — cf. CDC §3).
- **Dépendances** : BACK-G06, BACK-G08, RBAC de M1.

### MOBILE-G03 — Consultation biens/clients (offline-readable)

- **Tâches** : écrans de consultation pour les profils "client final" (recherche, filtre, détails, favoris) et "interne" limité — classification "offline-readable" selon `CLAUDE.md` §8.
- **Dépendances** : contrat Swagger de BACK-G07.

### DESIGN-G02 — Composants de fiche bien / galerie intelligente

- **Tâches** : cartes propriété (badge statut, favoris), galerie avec boutons Détails/Proposer, cohérents avec les patterns retenus de l'analyse d'inspiration UI (rayons de bordure généreux, CTA sticky en bas de fiche détail).
- **Dépendances** : DESIGN-G01.

**Parallélisation M2** : ADMIN-G03 et MOBILE-G03 démarrent dès publication du contrat Swagger BACK-G07 sans attendre son implémentation complète. ADMIN-G04 dépend réellement du RBAC détaillé, pas seulement du contrat — commence après M1 clôturé.

---

# MILESTONE 3 — Field Operations (Commissionnaires) + Collecte terrain Mobile offline-first

**Objectif** : cas d'usage mobile prioritaire, cœur du modèle économique terrain.

### BACK-G09 — Modèle `Commissionnaire`

- **Tâches** : profil (identité, zone, code, niveau Junior/Confirmé/Senior), scoring /100 (performance/qualité/discipline/engagement — actuellement `PropertyScore` n'a qu'un score générique unique, à étendre), système d'incidents, statuts (Actif/Observation/Suspendu/Exclu), grille d'évolution automatique.
- **Dépendances** : M1 (Organization — un commissionnaire peut être une `Person` avec ou sans `User`).
- **Critères d'acceptation** : passage automatique Junior→Confirmé selon les seuils du CDC (score ≥75 + conditions → upgrade, score <60 → alerte).

### BACK-G10 — Missions terrain et validation

- **Tâches** : modèle de mission (Collecte de bien, Apport client, Suivi), écran de validation avec actions Valider/Rejeter/Demander correction, idempotence des soumissions terrain (UUID client).
- **Dépendances** : BACK-G09, BACK-G06 (une mission peut créer un client).

### BACK-G11 — Suspension/exclusion → révocation automatique

- **Tâches** : brancher le changement de statut commissionnaire sur la révocation de session/`securityVersion` (déjà conçu en M1, câblé ici sur l'événement métier "commissionnaire suspendu").
- **Dépendances** : BACK-G01, BACK-G09.

### MOBILE-G04 — Collecte terrain offline-first complète

- **Tâches** : formulaire de collecte (bien + client), file de mutations locale (outbox), UUID généré à la création, `expo-sqlite` pour le stockage local structuré, `expo-camera`/`expo-image-picker` pour les médias avec le workflow complet (`CLAUDE.md` §8 — compression avant stockage, upload découplé, suppression post-confirmation), `expo-location` pour la géolocalisation optionnelle.
- **Dépendances** : contrat Swagger de BACK-G10 ; MOBILE-G02 (auth) ; DESIGN-G01/G02.
- **Critères d'acceptation** : une collecte complète (bien + photos + géolocalisation) fonctionne intégralement sans connexion réseau et se synchronise correctement au retour du réseau, sans duplication même en cas de coupure pendant la synchronisation.
- **Tests** : scénario de test simulant coupure réseau en cours de synchronisation (Jest + mock réseau).

### ADMIN-G05 — Écran de pilotage des commissionnaires

- **Tâches** : profil commissionnaire, validation des missions, classement/évolution.
- **Dépendances** : contrat Swagger BACK-G09/G10.

**Parallélisation M3** : MOBILE-G04 est le chemin critique de ce milestone — priorisé. ADMIN-G05 se développe en parallèle contre le même contrat Swagger.

---

# MILESTONE 4 — Treasury + Payments (niveau 1, sans fournisseur externe)

**Objectif** : gestion financière fiable et auditable, sans intégration de paiement en ligne.

### BACK-G12 — Caisses multiples et devises

- **Tâches** : `Caisse`, `CaisseBalance` (par devise), `Currency` (table configurable, USD/CDF pré-remplies), `ExchangeRate`.
- **Dépendances** : M1 (RBAC Trésorerie).

### BACK-G13 — Réquisitions (workflow déjà spécifié)

- **Tâches** : implémenter le circuit Saisie → Vérification → Approbation → Génération (PDF via `pdf-lib`) → Archivage tel que documenté dans la feuille de route fournie.
- **Dépendances** : BACK-G12.
- **Critères d'acceptation** : une réquisition approuvée génère un PDF avec code de validation unique, consultable et traçable (qui/quand/montant).

### BACK-G14 — Payment / PaymentMethod / append-only ledger

- **Tâches** : `Payment` découplé de `PaymentMethod`/`ProviderTransaction` (statuts prévus mais V1 = `recorded_manually` uniquement), `CashMovement`, `LedgerEntry` append-only.
- **Dépendances** : BACK-G12, BACK-G13.
- **Critères d'acceptation** : aucune `LedgerEntry` validée n'est modifiable — seule une écriture d'ajustement/annulation peut la corriger, avec trace complète.

### BACK-G15 — Commissions

- **Tâches** : calcul commission agence/agent/commissionnaire, association transaction↔agent, statut de paiement, alimentation du même circuit `Payment`→`CashMovement`→`LedgerEntry`.
- **Dépendances** : BACK-G14, BACK-G09 (commissionnaire), BACK-G08 (transaction conclue).

### ADMIN-G06 — Interfaces Trésorerie

- **Tâches** : écrans caisse, réquisitions, commissions selon le contrat Swagger.
- **Dépendances** : contrats Swagger BACK-G12 à G15.

**Parallélisation M4** : BACK-G13 peut démarrer dès BACK-G12 sans attendre G14/G15. ADMIN-G06 se construit progressivement au fur et à mesure des contrats publiés, pas en un seul bloc final.

---

# MILESTONE 5 — Tasks + Notifications/Alerts/Reminders + Realtime

**Objectif** : modules transversaux qui s'accrochent aux entités déjà créées dans M1-M4.

### BACK-G16 — Module Tasks

- **Tâches** : `Task` + tables de liaison explicites par type (`TaskPropertyLink`, `TaskClientLink`, etc. — pas de relation polymorphe générique), vues Kanban/liste, assignation multi-collaborateurs.
- **Dépendances** : M1 (RBAC), et les entités liables déjà créées (M2-M4) pour avoir du sens en usage réel.
- **Critères d'acceptation** : fermer une tâche liée à un bien ne modifie jamais le statut du bien (règle stricte `CLAUDE.md` §4).

### BACK-G17 — Notifications/Alerts/Reminders + event bus interne

- **Tâches** : `EventEmitter` interne (`shared/eventBus.js`), modèles `Notification`/`Alert`/`Reminder`, outbox pattern pour les effets secondaires critiques (paiement, suspension de compte), abstraction `PushProvider` (implémentation initiale Expo Push).
- **Dépendances** : M1 (destinataires = `User`), événements émis par les modules déjà développés (M2-M4).
- **Critères d'acceptation** : un événement "dépense approuvée" produit une `Notification` persistée ET une tentative de push, sans perte même si le push échoue (outbox).

### BACK-G18 — Realtime (Socket.IO) avec fallback

- **Tâches** : gateway Socket.IO, audiences calculées côté serveur (jamais de room fournie par le client), classification temps réel strict/quasi/à la demande.
- **Dépendances** : BACK-G02 (autorisation des audiences), BACK-G17 (source des événements à diffuser).
- **Critères d'acceptation** : déconnexion forcée de Socket.IO en test → le système reste intégralement fonctionnel via REST/polling, aucun workflow métier n'est bloqué.

### ADMIN-G07 / MOBILE-G05 — Intégration notifications + realtime côté client

- **Tâches** : `socket.io-client`, TanStack Query avec invalidation sur réception d'événement, `expo-notifications` côté Mobile, fallback polling/refetch si Socket.IO indisponible.
- **Dépendances** : contrats Swagger + WebSocket de BACK-G17/G18.

**Parallélisation M5** : peut démarrer dès M1 clôturé, en parallèle de M2-M4 — ce milestone n'attend pas la fin de M4, uniquement l'existence progressive des entités qu'il annote.

---

# MILESTONE 6 — Calendar + Reporting + Archivage formalisé

### BACK-G19 — Calendrier agrégé

- **Tâches** : requêtes agrégées sur Tasks/Reminders/CRM/Treasury, `CalendarEvent` uniquement pour les événements sans source ailleurs.
- **Dépendances** : M2-M5 (sources de données à agréger).

### BACK-G20 — Reporting

- **Tâches** : génération PDF (`pdf-lib`) pour rapports officiels/états de caisse, Excel (`exceljs`)/CSV pour l'analyse, respect des permissions et field-level authorization sur le contenu des rapports, génération à la demande en V1.
- **Dépendances** : données de M2-M4 suffisamment matures pour produire des rapports significatifs.

### BACK-G21 — Archivage formalisé

- **Tâches** : implémenter la distinction soft delete / archivage métier / rétention (`CLAUDE.md` §11) sur les ressources identifiées comme archivables (biens, clients, réquisitions, missions terrain).
- **Dépendances** : les modules concernés doivent déjà exister (M2-M4).

### ADMIN-G08 — Écrans calendrier et rapports

- **Dépendances** : contrats Swagger BACK-G19/G20.

**Parallélisation M6** : les trois goals Backend sont largement indépendants entre eux et parallélisables.

---

# MILESTONE 7 — RH avancé + Paiements fournisseur externe

**Objectif** : domaines explicitement repoussés par le porteur de projet à une phase ultérieure.

### BACK-G22 — RH avancé

- **Tâches** : évaluations, objectifs, plans de performance, gestion des compétences/formations — au-delà du noyau V1 déjà livré en M1 (BACK-G04).

### BACK-G23 — Intégration fournisseur de paiement externe

- **Tâches** : implémentation concrète de `ProviderTransaction` pour un ou plusieurs fournisseurs Mobile Money pertinents (M-Pesa/Airtel Money/Orange Money selon marché), sans refonte du domaine `Payment` déjà conçu en M4 pour accueillir cette extension.
- **Dépendances** : BACK-G14 (le découplage `Payment`/`ProviderTransaction` doit déjà exister).

---

## Addendum — ADMIN-G00 : Tableau de bord (page d'accueil du dashboard)

Goal découvert manquant lors de la finalisation du système (non nommé explicitement dans la version initiale de ce plan) : la page d'accueil du dashboard Admin (`/dashboard`) affichait des chiffres et une "activité récente" **entièrement inventés en dur** depuis la création du projet — jamais branchés sur une donnée réelle, malgré tous les modules métier sous-jacents (biens, clients, missions, réquisitions, caisses, commissions, utilisateurs) déjà livrés et fonctionnels.

- **Tâches** : `GET /api/dashboard/stats` (Backend) agrégeant des compteurs réels par domaine, chaque bloc n'étant renvoyé que si l'utilisateur a la permission de lecture correspondante (jamais de logique d'autorisation dupliquée côté Frontend, `CLAUDE.md` §2.2) ; `recentActivity` réelle fusionnée à partir des créations récentes de Property/Client/Mission/Requisition. Frontend : `dashboard/page.tsx` réécrit pour consommer cet endpoint, cartes masquées si le champ correspondant est absent de la réponse (jamais une carte affichant "0" par défaut pour un domaine non autorisé).
- **Dépendances** : tous les modules métier déjà livrés (M2-M6).
- **Statut** : ✅ livré, voir `walkthrough.md`.

---

## Workstreams transversaux — récapitulatif

| Workstream | Contenu principal | Répartition |
|---|---|---|
| **ARCH** | Décisions structurantes (monolithe modulaire, event bus, offline-first) | Concentré en M0-M1, révisé à chaque milestone si nécessaire |
| **SEC** | Corrections de sécurité (M0), puis RBAC/sessions (M1), puis vigilance continue à chaque nouveau module | M0 dense, puis continu |
| **DESIGN** | Tokens, composants, cohérence Web/Mobile | M0 (fondations), puis enrichi à chaque nouvel écran |
| **QA** | Outillage (M0), tests RBAC (M1), puis un test minimum par Goal livré | Continu, jamais un rattrapage final |
| **DEVOPS** | Environnements staging/production, CI, sauvegardes, observabilité | Démarre dès que les caractéristiques cPanel sont connues (point ouvert `CLAUDE.md` §16) |
| **DOC** | Swagger tenu à jour à chaque endpoint créé/modifié, `CLAUDE.md` mis à jour à chaque décision divergente | Continu, jamais différé |

---

## Décisions encore ouvertes (rappel de `CLAUDE.md` §16)

1. Caractéristiques précises de l'hébergement cPanel — conditionne DEVOPS et la viabilité définitive de Socket.IO en production (fallback déjà prévu dans tous les cas).
2. Liste complète des types d'`Alert` métier — à enrichir au fil de M3-M5.
3. Validation juridique des durées de rétention — à confirmer avant mise en production réelle, sans bloquer le développement.

Aucune de ces trois décisions ouvertes ne bloque le démarrage de M0.

---

*Ce plan est vivant — chaque Goal complété doit être marqué comme tel avec un lien vers sa Pull Request/commit correspondant, et toute déviation par rapport à ce plan doit d'abord être actée dans `CLAUDE.md` avant d'être exécutée.*
