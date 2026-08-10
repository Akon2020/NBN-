# CLAUDE.md — NBN Express Plus (Nyumbani Express Plus)

Ce fichier est la source principale d'instructions pour toute session de développement (humaine ou agent IA) sur le système NBN. Il reflète des décisions **validées**, pas des explorations. Toute contradiction entre ce fichier et un autre document plus ancien (`info.md`, `arch.md`, cahiers des charges) doit être résolue en faveur de ce fichier.

Dernière mise à jour : à la génération initiale, suite à l'audit complet du code réel (Backend/Frontend/Mobile) et à la phase de cadrage architectural.

---

## 0. Skills

Ne charger aucun skill par défaut. Vérifier la tâche d'abord — n'invoquer un skill que si le déclencheur exact correspond. Ne jamais invoquer un skill uniquement parce qu'il existe.

- `/architect` — avant de construire quelque chose de non-trivial sans plan existant
- `/review` — quand une fonctionnalité est terminée et nécessite une vérification production
- `/recover` — quand quelque chose est cassé et la correction n'est pas évidente
- `/remember` — au début d'une session pour restaurer le contexte, et à la fin pour sauvegarder la progression

## 0.1 Continuité de session

**OBLIGATOIRE — ne pas ignorer, ne pas attendre qu'on le demande :**

- Première action de chaque session : exécuter `/remember restore` avant toute autre chose.
- Dernière action de chaque session : exécuter `/remember save` avant de clore.

---

## 1. Vision du projet

NBN Express est une agence immobilière basée à Bukavu, Sud-Kivu, RDC. NBN Express Plus est le système digital interne en cours de construction pour digitaliser et industrialiser ses activités (location, vente, conseil, accueil/déménagement).

L'outil doit fonctionner comme **une base de données intelligente + un outil opérationnel terrain**, simple au départ mais structuré pour devenir à terme une plateforme immobilière majeure en Afrique, notamment en RDC (vision à long terme "NBN+", type Airbnb africain — hors périmètre de développement actuel, mentionnée pour contexte uniquement).

Contraintes non négociables héritées du contexte RDC :
- Application légère, fonctionnant avec une connexion faible.
- Images optimisées à chaque étape (upload serveur ET affichage client).
- Conception mobile-first / responsive obligatoire côté Web.
- Application mobile réellement **offline-first** pour les workflows terrain prioritaires (pas un vernis de cache).

Le système est composé de trois applications indépendantes (pas de monorepo à workspace partagé — décision actée, voir §9) :

| Application | Rôle | Stack |
|---|---|---|
| `Backend/` | API REST, monolithe modulaire | Node.js (ESM) / Express 5 / Sequelize / MySQL |
| `Frontend/` | Dashboard web interne (Admin) | Next.js 16 / React 19 / Tailwind / shadcn |
| `Mobile/` | Application mobile terrain + clients | Expo / React Native / NativeWind |

---

## 2. Décisions validées — résumé exécutif

Ces décisions ont été prises après audit du cahier des charges, du code réel, et plusieurs cycles de clarification. Elles ne sont **pas** à remettre en question sans une raison métier nouvelle et documentée.

1. Le mobile natif est un workstream parallèle dès le début, pas une phase 2.
2. Le Backend est la **seule** source d'autorité pour les permissions — Frontend et Mobile n'appliquent jamais de logique d'autorisation métier, seulement de l'affichage conditionnel basé sur ce que le Backend a déjà décidé/filtré.
3. RBAC hybride (Role + Permission) pour le cas général, complété par des règles contextuelles ciblées (`assignedTo`/`createdBy`) — pas de moteur ABAC générique.
4. Le rôle `consultant` a zéro permission de base ; tout son accès passe par un mécanisme d'exception séparé (`AccessGrant`), jamais par un override générique appliqué à tous les rôles.
5. Authentification par Access Token (courte durée) + Refresh Token (rotation, entité `Session` en base, révocation serveur fiable).
6. Field-level authorization générique côté sérialisation — pas de règle isolée codée en dur pour `margin` ou tout autre champ sensible.
7. Le système doit désormais couvrir, en plus du cœur immobilier/CRM du cahier des charges : Paiements, RH, Caisse/Trésorerie complète, Tâches/Kanban, Notifications/Alertes/Rappels, Calendrier, Reporting, Archivage. Voir §7 pour le détail par domaine.
8. Architecture temps réel (Socket.IO) — amélioration, jamais une dépendance dure. Le système doit rester intégralement fonctionnel sans elle.
9. Le stockage local mobile est SQLite (`expo-sqlite`), avec une abstraction Repository qui isole l'UI du moteur de stockage.
10. Base de données de développement actuelle **jetable** — pas de contrainte de migration de données historiques à respecter.
11. Contrat entre les trois projets maintenu **uniquement via Swagger** — trois projets indépendants, pas de package de schémas partagé. Chaque projet aligne manuellement ses schémas zod sur la documentation Swagger, qui est la source de vérité du contrat.
12. Hébergement cible : infrastructure cPanel — l'architecture doit rester portable et fonctionner en dégradé si des capacités (WebSocket persistant, workers) ne sont pas disponibles. Caractéristiques précises de l'hébergement encore à confirmer (voir §12, Décisions ouvertes).

---

## 3. Constat de sécurité de départ — corrections obligatoires avant tout nouveau développement

L'audit du code réel a mis en évidence des problèmes concrets, pas hypothétiques. Ils constituent le Milestone 0 (voir `plan.md`) et doivent être résolus avant tout développement sur les nouveaux domaines métier.

1. **Absence totale d'autorisation effective** sur `/api/users/*` — n'importe quel utilisateur authentifié peut créer un compte admin, lister/modifier/supprimer n'importe quel utilisateur. `authMiddlware` vérifie uniquement la présence d'un JWT valide, jamais le rôle.
2. **Incohérence de nom de cookie** — le login/register pose le cookie `token`, mais `authMiddlware` lit `req.cookies.loginToken`. L'authentification par cookie est non fonctionnelle côté Backend (seul le header `Authorization: Bearer` fonctionne réellement aujourd'hui).
3. **`cookie-parser` jamais enregistré** dans `app.js` — `req.cookies` vaut `undefined` à l'exécution, indépendamment du bug #2.
4. **Aucune vérification du statut utilisateur** (`ACTIVE`/`INACTIVE`) au moment de l'authentification — un compte désactivé peut continuer à s'authentifier tant que son token est valide.
5. **Bugs confirmés dans `property.controller.js`** : `getPropertiesByStatut` filtre sur un champ `statut` qui n'existe pas dans le modèle ; les `include` avec `as: "scores"` ne correspondent à aucun alias réellement défini dans les associations ; `deleteProperty` supprime via `propertyId` alors que la vraie colonne FK est `idProperty` (suppression en cascade silencieusement inopérante, orphelins en base).
6. **Secrets de production en clair dans le dépôt** (`config/config.json` contient `root`/`root` pour l'environnement `production`). À traiter comme potentiellement compromis — rotation obligatoire, pas seulement déplacement vers des variables d'environnement.
7. **Uploads sans restriction** — `multer` n'impose aucune limite de type MIME ni de taille propre (hérite de la limite globale `body-parser` de 1024 Mo).
8. **`helmet` installé mais jamais activé.**
9. **Aucun rate limiting** sur les routes sensibles, notamment `/api/auth/login`.
10. **Garde de rôle Frontend non branché** — `ProtectedRoute.tsx` existe et fonctionne mais est commenté dans `dashboard/layout.tsx`.
11. **Configuration Next.js risquée** — `next.config.mjs` a `typescript: { ignoreBuildErrors: true }` et `images: { unoptimized: true }`, en contradiction directe avec les contraintes RDC du cahier des charges.
12. **Absence totale de tests** sur les trois projets.
13. **Modèles métier essentiels inexistants** — aucune table `Client`, `Bailleur`, ou `Commissionnaire` n'existe en base malgré leur centralité dans le cahier des charges.

---

## 4. Architecture générale du Backend — monolithe modulaire

Le Backend reste un **monolithe modulaire**, pas des microservices. Chaque domaine métier est un module isolé avec ses propres modèles/contrôleurs/services, communiquant via des interfaces explicites et un event bus interne léger — jamais d'accès direct d'un module aux modèles internes d'un autre module.

```
Backend/
├── modules/
│   ├── identity/          — User, authentification, Session
│   ├── authorization/     — Role, Permission, AccessGrant, RBAC
│   ├── organization/      — Person, EmployeeProfile, Service/Département, Poste
│   ├── real-estate/       — Property, RentalProperty, SaleProperty, images/phones
│   ├── crm/                — Client, Bailleur, pipeline, scoring, matching
│   ├── field-ops/          — Commissionnaire, missions terrain, scoring commissionnaire
│   ├── tasks/               — Task, TaskPropertyLink, TaskClientLink, ... (Kanban)
│   ├── treasury/             — Caisse, CaisseBalance, mouvements, réquisitions
│   ├── payments/              — Payment, PaymentMethod, ProviderTransaction, Reconciliation
│   ├── notifications/          — Notification, Alert, Reminder
│   ├── realtime/                 — Socket.IO gateway, audiences calculées
│   ├── calendar/                  — CalendarEvent (agrégateur, pas une duplication)
│   ├── reporting/                   — génération PDF/Excel/CSV
│   ├── audit/                         — AuditLog (append-only)
│   └── files/                          — upload, stockage, cycle de vie des médias
├── shared/                — event bus interne (EventEmitter), outbox, utils transverses
```

### Entité centrale `Person` (organisation/RH)

```
Person            — identité humaine de base (nom, contact, pièce d'identité optionnelle)
  ↳ User (0-1)     — compte de connexion, nullable — une Person peut ne jamais se connecter
  ↳ EmployeeProfile (0-1) — profil RH, userId NULLABLE (un employé peut exister sans compte)
  ↳ Commissionnaire (0-1) — profil terrain, peut ou non avoir un User
  ↳ Client/Bailleur (0-N)  — une même Person peut apparaître comme client ET bailleur
```

Cette structure sépare explicitement : identité de connexion (`User`), personne (`Person`), profil RH (`EmployeeProfile`), rôle de sécurité (`Role`/`Permission`), poste organisationnel (`EmployeeProfile.position`). Ces concepts ne sont jamais fusionnés dans un unique champ `role`.

### Tâches — liaison aux ressources métier

Association via **tables de liaison explicites par type** (`TaskPropertyLink`, `TaskClientLink`, `TaskCommissionnaireLink`, etc.), jamais de relation polymorphe générique (`linkableType`/`linkableId`) — MySQL ne peut pas contraindre une FK conditionnelle par type, ce qui rendrait l'intégrité référentielle non garantie. Le nombre de types liables est borné et connu, donc les tables de liaison explicites restent gérables.

**Règle stricte** : le statut d'une `Task` ne pilote jamais l'état métier d'une ressource liée. Une tâche "visiter le bien X" peut être fermée sans que ça change le statut du bien — les workflows métier (pipeline commercial, cycle de vie d'un bien, validation d'une réquisition, collecte terrain) restent des sources de vérité séparées et autonomes du module `tasks`.

### Architecture financière — domaines distincts

```
Requisition (demande + approbation)
    → peut déclencher un Payment (décaissement)
        → génère un CashMovement dans une Caisse précise
            → produit une LedgerEntry (écriture append-only, jamais modifiée après validation)

Commission (calculée à partir d'une transaction immobilière conclue)
    → devient éligible à un Payment lorsqu'elle est due
        → suit le même chemin Payment → CashMovement → LedgerEntry
```

Règle stricte : une demande de dépense n'est pas un paiement ; un paiement n'est pas automatiquement un mouvement de caisse ; un mouvement de caisse n'est pas automatiquement une commission. Ces quatre concepts restent des tables distinctes.

`Payment` est découplé de `PaymentMethod` (espèces/virement/Mobile Money) et de `ProviderTransaction` (appel éventuel à un fournisseur externe type M-Pesa/Airtel Money/Orange Money). Statuts de `Payment` : `recorded_manually` / `initiated` / `provider_confirmed` / `pending` / `failed` / `cancelled` / `reconciled`. La V1 n'utilise que `recorded_manually` ; les autres statuts existent dès le schéma mais restent inertes jusqu'à une future intégration de fournisseur — même principe que `assignedTo` sur `Property` (champ présent, logique inactive).

### Caisses multiples et devises

```
Caisse (id, label, responsableUserId, statut ouvert/clôturé)
CaisseBalance (caisseId, currency, balance)   — un solde par devise et par caisse, jamais mélangés
CashMovement (caisseId, currency, amount, type entrée/sortie, ...)
Currency — table de référence configurable (USD et CDF pré-remplies, extensible sans migration)
ExchangeRate (from, to, rate, date, source) — pour le reporting consolidé uniquement
```

Ne jamais additionner silencieusement des montants de devises différentes dans un même total — tout calcul de total multi-devises doit explicitement passer par une conversion tracée (taux + date + source), jamais implicite.

### Notifications / Alertes / Rappels / Événements temps réel

Quatre concepts distincts avec un cycle de vie propre, reliés par des relations explicites (pas un sous-typage) :

```
Alert — cycle de vie propre : ouverte → reconnue → assignée → en cours → résolue → clôturée
Notification — message adressé à un utilisateur, historisable (in-app/push/email)
Reminder — programmé à partir d'une échéance/règle
RealtimeEvent — diffusion technique, pas forcément persistante

Événement métier (interne) → peut produire, indépendamment :
    une Alert (situation nécessitant suivi)
    une ou plusieurs Notification (information)
    un Reminder programmé (échéance future)
    un RealtimeEvent publié (mise à jour live)

Une Alert peut à son tour générer des Notification à chaque changement d'état.
```

### Calendrier

Vue **agrégée**, pas une duplication systématique. Une tâche avec échéance, une relance client, une échéance financière apparaissent dans le calendrier via une requête agrégée sur leurs modules d'origine. `CalendarEvent` n'existe comme table propre que pour les événements qui n'ont pas de source ailleurs (ex. un rendez-vous pur, sans lien à une autre entité).

### Archivage

Trois concepts distincts, jamais confondus :
- **Soft delete** (`deletedAt`) : réversible à court terme, invisible en usage normal (erreur de saisie).
- **Archivage métier** (`archivedAt` + `archiveReason`) : cycle de vie métier terminé mais consultable (ex. bien vendu depuis longtemps).
- **Rétention légale/opérationnelle** : politique de durée avant suppression définitive possible, distincte de l'archivage métier — **aucune durée légale n'est présentée comme une obligation certaine sans source juridique fiable** (voir §11, politique par défaut configurable).

---

## 5. Authentification, sessions, autorisation

### Access Token / Refresh Token

- Access Token : JWT, durée **15 minutes** (valeur en variable d'environnement, jamais en dur).
- Refresh Token Web : **7 jours**, stocké en cookie `httpOnly`, `secure`, `sameSite`.
- Refresh Token Mobile : **30 jours**, stocké via `expo-secure-store` (jamais AsyncStorage en clair).
- Rotation systématique à chaque refresh — l'ancien token est révoqué, un nouveau émis avec `replacedByTokenId` pointant vers le nouveau, formant une `tokenFamilyId`.
- **Détection de réutilisation** : un refresh token déjà révoqué présenté à nouveau déclenche la révocation immédiate de toute la famille de tokens de l'utilisateur/appareil concerné, et force une reconnexion.

### Entité `Session` (pas une simple table `RefreshToken`)

```
Session
  - id
  - userId
  - refreshTokenHash        (jamais le token en clair)
  - tokenFamilyId
  - platform                (web | ios | android)
  - deviceLabel              (dérivé du User-Agent, pas d'empreinte intrusive)
  - lastActiveAt
  - createdAt
  - expiresAt
  - revokedAt (nullable)
  - revokedReason (nullable — enum: logout | logout_all | admin_revoke | reuse_detected | account_suspended | expired)
```

**Ce qui n'est délibérément pas collecté** : IP précise en clair persistée long terme, empreinte d'appareil détaillée (fingerprinting), historique de localisation précis. Principe de minimisation des données.

### Révocation rapide sans dépendance Redis (contrainte cPanel)

- `User.securityVersion` (entier), incrémenté à chaque événement de révocation (suspension, exclusion, changement de mot de passe, "déconnecter toutes les sessions").
- L'access token embarque `securityVersion` au moment de son émission.
- À chaque requête, le middleware compare cette valeur à la valeur actuelle, lue depuis un **cache in-process** (`Map<userId, {version, cachedAt}>`) avec expiration courte (~60 secondes). Un cache-miss déclenche un `SELECT` léger (une seule colonne) qui rafraîchit le cache.
- Fenêtre d'exposition réelle après suspension : au maximum ~60 secondes, sans dépendance à Redis.
- **Limite assumée à documenter et surveiller** : si l'hébergement final fait tourner plusieurs process Node en parallèle (cluster), ce cache n'est plus synchronisé entre process. L'interface de cache est conçue comme une abstraction remplaçable (interface `SecurityVersionCache`) pour basculer vers un cache partagé (Redis ou équivalent) sans réécrire la logique de vérification, dès que les caractéristiques réelles de l'hébergement cPanel seront connues.
- Suspension/exclusion d'un compte → révocation immédiate de toutes ses `Session` actives, **et** incrément de `securityVersion` (double mécanisme, cohérent l'un avec l'autre).

### RBAC — modèle retenu

```
Role (statique, catalogue fermé)
  → RolePermission[] (permissions par défaut du rôle)

User
  → role (obligatoire, un seul rôle de base)
  → status (actif/suspendu/exclu)

AccessGrant   ← mécanisme séparé pour les exceptions, PAS un override générique
  - userId
  - permission (unitaire, explicite)
  - grantedBy (admin responsable — auditabilité)
  - grantedAt
  - expiresAt (nullable)
  - reason (texte libre, obligatoire)
  - revokedAt / revokedBy (nullable)
```

Pour les rôles opérationnels normaux (Communication, Marketing, Opérations, Technologique, Juridique, Trésorerie, Commissionnaire, Admin), les permissions viennent **uniquement** du rôle — jamais d'`AccessGrant` en usage courant. Deux utilisateurs du même rôle ont toujours le même set de permissions.

Le rôle `consultant` naît avec **zéro permission de base**. Tout son accès passe par des `AccessGrant` explicitement accordés par un Admin, avec `expiresAt` optionnel :
- `expiresAt = null` → accès permanent jusqu'à révocation manuelle.
- `expiresAt` renseigné → accès automatiquement refusé à expiration, sessions actives invalidées, événement journalisé.
- Un Admin peut suspendre, réactiver, ou révoquer définitivement l'accès d'un consultant.

### Field-level authorization

Couche de sérialisation centralisée par ressource — pas de `if` dispersés dans les contrôleurs. Un serializer consulte les permissions effectives (rôle + `AccessGrant` actifs non expirés) avant de construire la réponse JSON.

**Champs sensibles identifiés à ce jour** (liste à compléter au fil du développement) : `Property.margin`, données financières détaillées côté `Client`/`Bailleur`, données juridiques complètes (titre foncier, statut litige), montants de commission, tags internes sensibles ("À éviter", "Risqué").

### Règles contextuelles (extension future du RBAC)

`assignedTo`/`createdBy` sont ajoutés dès maintenant au schéma (`Property.createdBy` existe déjà dans le code réel) mais restent **inertes** en V1 — le RBAC reste un cloisonnement par service uniquement pour le lancement. Le jour où un cloisonnement par agent/zone est activé, c'est un changement de logique d'autorisation (ajout d'une clause de filtrage), pas une migration de schéma.

---

## 6. Temps réel

### Principe

Le Backend reste le hub central. Frontend Admin et Mobile ne communiquent jamais directement entre eux pour synchroniser l'état métier.

```
Frontend Admin ─┐
                │
                ▼
             Backend
                ▲
                │
Mobile App ─────┘
```

### Classification des besoins

| Catégorie | Exemples | Mécanisme |
|---|---|---|
| Temps réel strict | Notification urgente, changement de statut d'une mission en cours de validation | Socket.IO |
| Quasi temps réel | Tableau de bord, nouveau prospect assigné, changement de statut d'un bien | Socket.IO → invalidation de cache ciblée (TanStack Query refetch), pas de poussée de données brutes |
| Rafraîchissement à la demande | Listes, recherche, fiches ponctuelles | TanStack Query classique, pas de WebSocket |

### Audiences calculées côté serveur

À la connexion, le serveur authentifie le token puis **calcule lui-même** les rooms auxquelles l'utilisateur a droit via la même couche d'autorisation que le REST. Le client ne fournit jamais de nom de room — une audience peut être un utilisateur individuel, un service, une agence, une équipe, une ressource spécifique, ou une audience calculée dynamiquement. **Le nom d'une room fourni par le client n'est jamais considéré comme une preuve d'autorisation.**

### Distinction Socket.IO ≠ push mobile

```
Événement interne "expense:approved"
    ├── RealtimeEvent → Socket.IO → clients actuellement connectés dans la bonne room
    └── Notification → push mobile (Expo Push) → atteint l'app même fermée/en arrière-plan
```

Le Mobile ne dépend jamais de Socket.IO pour recevoir une information critique — le push et la persistance en base (consultable au retour dans l'app) sont le canal fiable.

### Fallback obligatoire si Socket.IO indisponible

- Aucun workflow métier ne doit devenir inutilisable sans Socket.IO.
- TanStack Query bascule sur `refetchOnWindowFocus`/`refetchOnReconnect` + polling raisonnable pour les vues qui en bénéficient réellement.
- Les notifications restent consultables via l'API REST classique.
- Le code Frontend/Mobile ne présuppose jamais que Socket.IO a livré l'information — le REST est toujours traité comme source de vérité, Socket.IO comme simple déclencheur d'invalidation.
- **Point ouvert** : à confirmer/ajuster dès réception des caractéristiques précises de l'hébergement cPanel (support WebSocket, process Node persistant).

---

## 7. Domaines hors cahier des charges — cadrage validé

### Paiements
- Couvre à terme encaissements (client → NBN : loyers, ventes, réservations, acomptes) et décaissements (NBN → commissionnaire/agent/fournisseur, remboursements).
- V1 : enregistrement et suivi fiable et auditable des paiements/mouvements financiers, sans intégration fournisseur externe.
- Architecture découplée dès le départ (voir §4, architecture financière) pour permettre une intégration future de fournisseurs (M-Pesa, Airtel Money, Orange Money) sans refonte du domaine.
- Idempotence stricte exigée sur toute opération financière.

### Notifications / Alertes / Rappels
Voir §4. Architecture événementielle interne légère (`EventEmitter` in-process), pas de message broker externe. Outbox pattern uniquement pour les effets secondaires dont la perte serait coûteuse (ex. paiement, changement de statut de compte) — pas systématique.

### Tâches / Kanban
Voir §4. Workflows métier (pipeline commercial, cycle de vie d'un bien, validation de réquisition, collecte terrain) restent séparés et autonomes du module `tasks` générique.

### Ressources Humaines
Noyau V1 à concevoir : identité du collaborateur, interne/externe, service/département, poste, responsable hiérarchique, type de contrat, date d'entrée, statut professionnel, documents RH, absences/congés, présence si pertinente, onboarding/offboarding.
Repoussé à un milestone ultérieur : évaluations avancées, objectifs, plans de performance, gestion complexe des compétences, formations avancées.
`EmployeeProfile.userId` est **nullable** — un employé peut exister sans compte de connexion.

### Caisse et Trésorerie
Architecture multi-caisses (voir §4), multi-devises (USD/CDF prioritaires, table `Currency` configurable). Logique append-only ledger pour toute écriture financière validée — corrections uniquement par annulation/contre-écriture/ajustement, jamais par modification silencieuse.

### Reporting
V1 : génération à la demande, téléchargement, consultation selon permissions. Évolution prévue dès l'architecture : génération programmée, envoi automatique, rapports périodiques.
Formats : PDF stylisé (rapports officiels, états de caisse, documents à imprimer/présenter — via `pdf-lib`) ; Excel/CSV (analyse, exploitation, export — via `exceljs`/génération CSV native). Un seul moteur de génération n'est pas supposé convenir à tous les formats. Les rapports respectent les permissions et la protection des champs sensibles (même couche de field-level authorization que l'API).

### Calendrier
Voir §4 — vue agrégée, pas de duplication systématique.

### Archivage
Voir §4. Politique technique par défaut définie en §11, avec mention explicite que les exigences légales doivent être validées selon la juridiction d'exploitation — aucune durée n'est présentée comme une obligation légale certaine sans source fiable.

---

## 8. Offline-first Mobile

### Classification des fonctionnalités

| Catégorie | Fonctionnalités |
|---|---|
| **Offline-first** | Collecte de bien (formulaire complet), ajout/collecte de client par un commissionnaire, prise de photos terrain, géolocalisation au moment de la collecte |
| **Offline-readable** | Consultation des biens/clients déjà synchronisés, favoris (lecture), fiche profil commissionnaire, historique des missions passées |
| **Online-only** | Recherche/filtrage sur l'ensemble du catalogue, validation/rejet de mission, actions financières, notifications push, authentification initiale, changement de statut d'un bien par un tiers |

### Architecture en couches

```
UI Components
    ↓
Repository (interface unique consommée par l'UI — ne connaît pas SQLite)
    ↓
    ├── Local Data Source (expo-sqlite)
    ├── Remote Data Source (appels API)
    └── Sync Engine (orchestration : détecte le retour réseau, vide l'outbox, résout les conflits)
```

Le choix du moteur de stockage local (`expo-sqlite`, retenu) est un détail d'implémentation du Local Data Source, remplaçable sans toucher aux composants UI.

### Matrice de résolution de conflits

| Type de donnée | Stratégie |
|---|---|
| Création (nouveau bien/client) | UUID généré côté client dès la création locale → idempotence garantie côté serveur |
| Médias (photos) | Additifs et indépendants — chaque photo a son propre statut d'upload, jamais lié au succès/échec de la ressource parente |
| Champs descriptifs | Versionnement simple (`updatedAt`/`updatedBy`) — conflit signalé à l'utilisateur plutôt qu'écrasement silencieux |
| Données financières (prix, marge, commission) | Jamais de résolution automatique — conflit bloquant explicite nécessitant validation humaine |
| Changement de statut | Le serveur est seul autorité sur les transitions valides — revalidation des règles métier de transition au moment de la synchro |

### Workflow médias

`Compression/redimensionnement dès la prise de photo (avant stockage local) → file d'attente locale → tentative d'upload avec retry progressif → confirmation serveur → suppression du fichier local`. En cas d'échec persistant, le fichier reste local avec statut "échec", visible et relançable manuellement — jamais de perte silencieuse. Déduplication via hash de fichier. Upload de médias **découplé** de la création de la ressource métier — un échec d'upload photo ne rend jamais invalide la synchronisation du bien/client associé.

### Synchronisation

Ordre FIFO à la reconnexion (pas de traitement parallèle non ordonné) — important quand une même ressource a plusieurs mutations en attente.

---

## 9. Contrats entre les trois projets

**Décision actée** : trois projets indépendants, pas de monorepo à workspace partagé, pas de package de schémas zod partagé.

Le contrat entre Backend/Frontend/Mobile est maintenu **uniquement via Swagger** (déjà en place côté Backend, exposé sur `/api-docs`). Chaque projet redéfinit et aligne manuellement ses propres schémas zod sur la documentation Swagger. Toute modification d'un contrat API doit être répercutée dans la documentation Swagger **avant** ou **en même temps** que le changement de code, jamais après.

Ce choix accepte le risque déjà identifié à l'audit (ex. `User` redéfini indépendamment côté Frontend et Backend) comme un compromis assumé — pas une dette non documentée.

---

## 10. Design System

### Palette — valeurs mesurées (extraction colorimétrique réelle sur logo.png et le flyer NBN, pas une estimation visuelle)

| Token | Hex | Usage |
|---|---|---|
| `primary-900` (navy) | `#14294A` | Couleur de marque principale — headers, nav, fonds de marque |
| `primary-700` | `#1E3A63` | Variante hover/pressed du navy |
| `accent-500` (orange vif) | `#F25414` | Badges, icônes, éléments larges, texte de grande taille uniquement |
| `accent-600` (orange bouton) | `#C13F0B` | **Fond de bouton avec texte blanc** — `accent-500` ne passe PAS le contraste AA en texte normal (voir ci-dessous) |
| `secondary-600` (vert marque) | `#245640` | Accent identitaire ponctuel — jamais de fond large ni de texte sur fond clair uniquement |
| `success-500` | `#2F7350` | Sémantique "succès/validé", distinct du vert de marque |
| `warning-500` | `#F59E0B` | Alertes, statuts "Observation", "À vérifier" |
| `error-500` | `#D92D20` | Erreurs, statuts "Suspendu"/"Risqué" |
| `neutral-900` (texte) | `#16181D` | Texte principal |
| `neutral-600` | `#5B6472` | Texte secondaire/labels |
| `neutral-100` (surface) | `#F7F7F7` | Fonds de contenu, cartes |
| `white` | `#FFFFFF` | Fond de page, texte sur navy/vert |

### Ratios WCAG mesurés (calcul réel, pas estimé)

| Paire | Ratio | AA texte normal (4.5:1) |
|---|---|---|
| Blanc sur `primary-900` | 14.52:1 | ✅ |
| `neutral-900` sur blanc | 17.76:1 | ✅ |
| `neutral-600` sur blanc | 5.98:1 | ✅ |
| **Blanc sur `accent-500` (#F25414)** | **3.47:1** | **❌ — ne jamais utiliser en texte normal** |
| **Blanc sur `accent-600` (#C13F0B)** | **5.25:1** | **✅ — utiliser pour les boutons pleins avec texte blanc** |
| Blanc sur `secondary-600` (vert) | 8.47:1 | ✅ |
| `primary-900` vs `secondary-600` | 1.72:1 | ❌ — ne jamais combiner ces deux couleurs en texte/fond |
| Blanc sur `error-500` | 4.83:1 | ✅ |
| `neutral-900` sur `warning-500` | 8.27:1 | ✅ |

**Règles non négociables** :
1. `accent-500` (#F25414) ne s'utilise jamais comme fond de bouton avec texte blanc standard — utiliser `accent-600` (#C13F0B) à la place. `accent-500` reste utilisable pour icônes, badges, texte large/gras (≥18px ou ≥14px gras).
2. Navy (`primary-900`) et vert de marque (`secondary-600`) ne se combinent jamais en texte/fond entre eux (1.72:1, illisible).

### Typographie

- Titres/Display : sans-serif géométrique bold/condensée — **Manrope** ou **Sora**.
- Corps de texte : **Inter** (référence de lisibilité UI en petite taille sur mobile).
- Hiérarchie : Display (32/40 semibold) → H1 (24/32 semibold) → H2 (20/28 semibold) → H3 (16/24 semibold) → Body (14/20 regular) → Caption (12/16 regular).
- Poids embarqués limités à Regular/Medium/Semibold — pas de Light/Black, cohérent avec la contrainte "application légère".

### Cohérence Web/Mobile

Les tokens de couleur ci-dessus sont déclarés à l'identique dans le thème Tailwind du Frontend et dans `tailwind.config.js` du Mobile (NativeWind) — mêmes noms de tokens des deux côtés, cohérence garantie par construction.

---

## 11. Politique de rétention et d'archivage — par défaut technique

**Aucune durée ci-dessous n'est une obligation légale confirmée** — validation juridique par juridiction d'exploitation requise avant mise en production réelle.

- Logs techniques (erreurs applicatives) : rétention 14-30 jours (Sentry).
- Logs d'audit métier (`AuditLog`, append-only) : rétention longue par défaut (12+ mois), configurable, stockée séparément des logs techniques.
- Données financières et d'audit : conservation longue par défaut, suppression très contrôlée (jamais de suppression définitive sans passage par archivage préalable).
- Sauvegardes base de données : quotidiennes automatisées, rétention 30 jours glissants + une sauvegarde mensuelle conservée 12 mois, test de restauration trimestriel documenté (une sauvegarde non testée n'est pas considérée comme une stratégie de restauration fiable).

Toutes ces durées sont des variables de configuration, pas des constantes codées en dur.

---

## 12. Stack technique par projet

### Backend (Node.js / Express / Sequelize / MySQL)

Socle existant conservé : Express 5, Sequelize 6, mysql2, JWT, bcryptjs, multer, nodemailer, winston, swagger-jsdoc/swagger-ui-express.

Ajouts :
- Validation : `zod`.
- Rate limiting : `express-rate-limit` (store in-memory par défaut, cohérent avec la contrainte cPanel mono-process tant que non infirmée).
- Sécurité HTTP : `helmet` (déjà en dépendance, à activer).
- Realtime : `socket.io`.
- Event bus interne : `EventEmitter` Node natif encapsulé (`shared/eventBus.js`).
- Outbox pattern : table `OutboxEvent` + job cron, pas de lib dédiée.
- PDF : `pdf-lib` (déjà en dépendance, à exploiter enfin).
- Excel : `exceljs`. CSV : génération native.
- Cron : `node-cron`.
- Traitement d'image : `sharp` (déjà en dépendance, à exploiter enfin).
- Tests : `vitest` + `supertest`.

### Frontend Admin (Next.js)

Socle existant conservé : Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, Radix, axios, js-cookie, zod, react-hook-form, next-themes, recharts.

Ajouts :
- Server state / cache : `@tanstack/react-query`.
- Realtime client : `socket.io-client`.
- Tables de données : `@tanstack/react-table` (en complément des primitives shadcn `table`).
- Tests : `vitest` + `@testing-library/react` + Playwright pour quelques parcours E2E critiques.

### Mobile (Expo / React Native)

Socle existant conservé : Expo SDK 54, Expo Router, React Native 0.81, React 19, `expo-image`, `react-native-reanimated`/`worklets`, `@react-navigation`.

**Style : NativeWind** (décision explicite du porteur de projet — https://www.nativewind.dev/).

Installation :
```bash
npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context
```
- `tailwind.config.js` à la racine, `content` pointant vers `app/**/*.{js,jsx,ts,tsx}` et `components/**/*.{js,jsx,ts,tsx}`, thème étendu avec les tokens du §10.
- `metro.config.js` : `withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" })`.
- `babel.config.js` : ajout du preset NativeWind à `babel-preset-expo` (déjà présent).
- `global.css` à la racine, importé une fois dans `app/_layout.tsx`.
- `nativewind-env.d.ts` pour le support TypeScript des `className`.

Ajouts fonctionnels :
- Client HTTP : `axios` (intercepteurs request/response pour le token et la rotation refresh, `lib/api.ts`).
- Stockage sécurisé (tokens) : `expo-secure-store`.
- Stockage local structuré (offline) : `expo-sqlite`, via un vrai Repository (`lib/repository/`) — jamais consommé directement par l'UI.
- Galerie/appareil photo : `expo-image-picker` (via `launchCameraAsync`, qui couvre déjà l'accès caméra — `expo-camera` reste en dépendance mais n'est pas utilisé, à retirer si aucun besoin de flux caméra live n'apparaît). Géolocalisation : `expo-location`.
- Push : `expo-notifications` (Expo Push Service) — voir §16 point ouvert (aucun `projectId` EAS lié pour l'instant, le chemin de code est prêt mais inerte).
- Realtime : `socket.io-client`.
- **Décision divergente actée (remplace la ligne originale "react-hook-form + zod + @tanstack/react-query")** : formulaires en `useState` manuel par champ + validation inline, appels réseau directs via des fonctions `lib/*.ts` typées (pas de cache de requêtes partagé). Choix retenu après implémentation réelle et testée (missions terrain, collecte bien/client, dashboard/tâches) — pas de regret de conception identifié à ce jour ; à revisiter seulement si une vraie douleur de cache/duplication de requêtes apparaît, pas par anticipation.
- Tests : `jest`, niveau logique/service uniquement à ce jour (repository, sync engine, résolution de rôle) — `@testing-library/react-native` est en dépendance mais aucun test de composant n'existe encore.

### Outillage transversal

- Lint/format : ESLint (déjà présent Backend/Mobile, à ajouter Frontend si manquant) + Prettier partagé.
- CI : GitHub Actions (lint + tests + build) sur les trois projets, déclenché par dossier modifié.
- Observabilité erreurs : Sentry (Web + Backend + Mobile).

---

## 13. Conventions de code

- **Nommage** : anglais pour le code (variables, fonctions, noms de modèles), français acceptable pour les messages utilisateur et commentaires métier. Cohérent avec le code existant qui mélange déjà les deux de façon similaire.
- **TypeScript** (Frontend/Mobile) : `strict` activé, **jamais** de `ignoreBuildErrors: true` en configuration Next.js — la correction de ce point fait partie du Milestone 0.
- **Gestion des erreurs Backend** : chaque contrôleur délègue au middleware d'erreur centralisé existant (`error.middleware.js`), pas de `try/catch` qui avale silencieusement une erreur sans la relayer à `next(error)`.
- **Logs** : distinction stricte entre logs techniques (Winston, déjà en place) et logs d'audit métier (`AuditLog`, table dédiée, append-only) — jamais mélangés. Aucun log ne doit contenir mot de passe, token, secret, ou donnée personnelle sensible non nécessaire.
- **Variables d'environnement** : toute valeur de configuration (durées de tokens, limites de taille, seuils) est une variable d'environnement avec une valeur par défaut documentée — jamais une constante en dur dans le code métier.
- **Migrations Sequelize** : toute modification de schéma passe par une migration versionnée (`sequelize-cli`), jamais par une modification manuelle de `db.sync({ alter: true })` en production.

---

## 14. Commandes essentielles

### Backend
```bash
npm run dev              # démarrage développement (nodemon)
npm run db:migrate       # appliquer les migrations
npm run db:seed          # appliquer les seeders
npm run db:reset         # reset complet (undo all → migrate → seed)
npm test                 # tests (vitest)
```

### Frontend
```bash
npm run dev
npm run build
npm run lint
```

### Mobile
```bash
npx expo start
npx expo start --android
npx expo start --ios
```

---

## 15. Critères de définition de "terminé" (Definition of Done)

Une tâche/fonctionnalité n'est considérée terminée que si :
1. Le code respecte les conventions de ce fichier (nommage, gestion d'erreur, logs, env vars).
2. La permission requise est vérifiée côté Backend (jamais uniquement côté client).
3. Les champs sensibles concernés passent par la couche de field-level authorization, pas une règle isolée.
4. La documentation Swagger est à jour si un endpoint est créé/modifié.
5. Un test (unitaire ou d'intégration selon le cas) couvre au minimum le chemin critique et le cas de refus de permission.
6. Pour le Mobile : la fonctionnalité respecte sa classification offline (offline-first / offline-readable / online-only) telle que définie en §8 — pas de comportement offline improvisé hors de cette classification.
7. Pour toute donnée financière : la traçabilité append-only est respectée, aucune modification silencieuse n'est possible.

---

## 16. Décisions encore ouvertes

Ces points ne bloquent pas le développement mais doivent être tranchés dès que l'information sera disponible, et documentés ici une fois résolus :

1. **Caractéristiques précises de l'hébergement cPanel** (support Node.js/Passenger, WebSocket, process persistant, cron, workers, quotas de stockage) — conditionne le choix définitif du cache de révocation (in-process vs partagé) et la viabilité de Socket.IO en production.
2. **Frontière exacte du modèle `Alert`** — le modèle relationnel est acté, mais la liste complète des types d'alertes métier (au-delà des cas déjà identifiés : score commissionnaire bas, dépense en attente) reste à enrichir au fil du développement.
3. **Validation juridique des durées de rétention** (§11) — à confirmer avec une source juridique fiable selon la juridiction d'exploitation réelle.
4. **Faire un push à ala branche dev** - après chaque fonctionnalité  faire un commit bien et un push sur la branche dev contenant un bon message de PR. Ne fais nullement apparaitre claude ou même antropics dans ces commits.
5. **Journaliser chaque étape dans un fcichier `walkthrough.md`**
6. **Aucun `projectId` EAS lié au projet Mobile** — `Mobile/lib/notifications.ts::registerPushToken` sait déjà lire `Constants.expoConfig?.extra?.eas?.projectId` et appeler `getExpoPushTokenAsync`, mais n'a jamais rien à lire : le token Expo Push n'est donc jamais obtenu ni envoyé à `POST /api/notifications/push-token`, même hors Expo Go. Aucun effet négatif observé (l'absence est un no-op silencieux, la Notification reste consultable via l'API REST) — mais le push mobile réel restera inerte tant qu'un projet EAS n'est pas provisionné et lié (`eas init`), action qui requiert un compte Expo/EAS et n'a pas été effectuée.

---

*Ce fichier doit être mis à jour à chaque décision architecturale significative. Toute session de développement qui prend une décision divergeant de ce document doit d'abord le mettre à jour, pas seulement coder différemment.*
