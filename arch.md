# Architecture — NBN Express Plus

Ce document décrit l'architecture technique de **ce qui est réellement codé aujourd'hui** dans les trois sous-projets du dépôt (Backend, Frontend, Mobile). Pour la vision produit et la roadmap, voir [info.md](info.md).

Le dépôt est un **monorepo à trois applications indépendantes**, sans workspace partagé (pas de types ou de code commun entre elles) :

```
NyumbaniExpressPlus/
├── Backend/    → API REST (Node.js / Express / Sequelize / MySQL)
├── Frontend/   → Dashboard web interne (Next.js 16 / React 19)
└── Mobile/     → Application mobile (Expo / React Native) — squelette par défaut
```

---

## 1. Backend

### 1.1 Stack
Node.js (ESM, `"type": "module"`), Express 5, Sequelize 6 + `mysql2` (MySQL), JWT (`jsonwebtoken`), `bcryptjs`, `multer` (upload fichiers), `nodemailer` (emails), `winston` (logs), `swagger-jsdoc` + `swagger-ui-express` (doc API), `sharp` (image processing, dépendance présente mais non utilisée dans les contrôleurs actuels).

### 1.2 Structure de dossiers

```
Backend/
├── app.js                  → point d'entrée Express, montage des routes, sync des modèles
├── config/
│   ├── env.js               → charge et ré-exporte les variables d'environnement (dotenv)
│   ├── config.json          → config Sequelize CLI (migrations)
│   └── nodemailer.js        → transporteur SMTP
├── database/db.js           → instance Sequelize (connexion MySQL)
├── models/                  → définitions Sequelize (un fichier par table)
│   └── index.model.js       → centralise les associations + syncModels()
├── migrations/               → migrations Sequelize CLI (schéma de référence de la BDD)
├── seeders/                  → jeux de données de test (Sequelize CLI)
├── controllers/              → logique métier par ressource
├── routes/                   → définition des endpoints Express (+ doc Swagger inline)
├── middlewares/               → auth, gestion d'erreurs, upload
├── utils/                     → helpers (email, fichiers, utilisateurs)
└── swagger.js                 → configuration Swagger (exposé sur /api-docs)
```

### 1.3 Cycle de vie de l'application ([app.js](Backend/app.js))

1. Chargement des variables d'env via [config/env.js](Backend/config/env.js) (`.env.<NODE_ENV>.local`)
2. Middlewares globaux : `morgan` (logs HTTP), `express.json`/`urlencoded`, `body-parser` (limite 1024mb pour les uploads d'images), `cors` avec whitelist explicite (`localhost:3000`, `127.0.0.1:3000`, `127.0.0.1:5500`, `https://nbn-plus.vercel.app`) et `credentials: true`
3. Montage de Swagger sur `/api-docs`
4. Montage des routeurs : **seuls `userRouter` (`/api/users`) et `authRouter` (`/api/auth`) sont actifs**
5. Route `/error` (logs, dev uniquement) et middleware d'erreur global
6. Au démarrage : `syncModels()` (voir §1.5) puis `app.listen(PORT)`

### 1.4 Authentification ([auth.controller.js](Backend/controllers/auth.controller.js), [auth.middleware.js](Backend/middlewares/auth.middleware.js))

- Mots de passe hashés avec `bcryptjs` (salt généré à la volée)
- `POST /api/auth/register` : crée un utilisateur, envoie un email de bienvenue (`nodemailer`), pose un cookie `token` (`httpOnly`, `secure`) contenant un JWT
- `POST /api/auth/login` : vérifie email/mot de passe ; si le mot de passe est encore le mot de passe par défaut (`DEFAULT_PASSWD`), renvoie `403 requiresPasswordChange: true` au lieu de connecter l'utilisateur ; sinon pose le cookie `token` et renvoie aussi le JWT dans le corps de la réponse
- `POST /api/auth/reset-password` puis `POST /api/auth/resetpassword?token=...` : flux de réinitialisation par email avec token JWT temporaire
- `authMiddlware` : accepte le JWT soit via header `Authorization: Bearer <token>`, soit via le cookie `token` — recharge l'utilisateur en base à chaque requête et l'attache à `req.user`
- Aucun contrôle de rôle (RBAC) au niveau middleware : `authMiddlware` vérifie seulement qu'un utilisateur valide est authentifié, pas son rôle

### 1.5 Couche données (Sequelize)

Connexion MySQL unique ([database/db.js](Backend/database/db.js)), synchronisation au démarrage via `db.sync({ alter: false })` (les modèles décrivent le schéma vivant, les migrations dans [migrations/](Backend/migrations) sont la trace versionnée du même schéma).

**Modèles et associations** ([models/index.model.js](Backend/models/index.model.js)) :

- `User` 1—N `Property` (`idUserCreator`)
- `Property` 1—1 `RentalProperty` et 1—1 `SaleProperty` (spécialisation par catégorie)
- `Property` 1—N `PropertyImage` (as `images`), 1—N `PropertyPhone` (as `phones`)
- `Property` 1—1 `PropertyScore`
- `User` ↔ `Property` N—N via `Favorite` (table de jointure)
- `Property` 1—N `Proposal`
- `User` 1—N `ActivityLog`

Modèle `Property` central ([property.model.js](Backend/models/property.model.js)) : `category` (RENT/SALE), `propertyType` (APPARTEMENT, MAISON, CONSTRUCTION_DURABLE/SEMI_DURABLE, TERRAIN_PLAT/PENTE), adresse (quartier/avenue/fullAddress), caractéristiques (floors/bedrooms/livingRooms/toilets/kitchens), `price`, `margin` (champ interne), coordonnées GPS, `isActive`, `createdBy`.

Modèle `User` ([user.model.js](Backend/models/user.model.js)) : `role` = ENUM(`admin`, `agent`, `consultant`) — pas de granularité par service métier pour l'instant.

### 1.6 Contrôleurs — état réel

| Contrôleur | État |
|---|---|
| `auth.controller.js` | ✅ Implémenté et routé (register, login, logout, reset/update password) |
| `user.controller.js` | ✅ Implémenté et routé (CRUD complet + changement de mot de passe) |
| `property.controller.js` | 🔨 Partiellement implémenté (`getAllProperties`, `getSingleProperty`, `getPropertiesByStatut`, `deleteProperty` avec transaction Sequelize et suppression en cascade des images/téléphones/scores) — **aucune route ne l'expose**, pas de `create`/`update` |
| `favorite.controller.js` | ⬜ Fichier vide (0 ligne) — pas de logique |
| `proposal.controller.js` | ⬜ Fichier vide (0 ligne) — pas de logique |

### 1.7 Middlewares

- [auth.middleware.js](Backend/middlewares/auth.middleware.js) : `authMiddlware` (vérification JWT) + `checkAuthStatus` (endpoint `/api/auth/status`)
- [error.middleware.js](Backend/middlewares/error.middleware.js) : logger Winston (console + fichier `logs/error.log`), traduction des codes d'erreur MySQL (`ER_DUP_ENTRY`, `ER_ACCESS_DENIED_ERROR`, etc.) et des erreurs JWT en réponses HTTP appropriées
- [upload.middleware.js](Backend/middlewares/upload.middleware.js) : `multer` en stockage disque, dossier de destination choisi selon le `fieldname` (`avatar` → `uploads/avatars`, `image` → `uploads/images`, sinon `uploads/autres`), nom de fichier randomisé

### 1.8 Documentation API

Swagger généré depuis les commentaires JSDoc présents directement dans les fichiers de [routes/](Backend/routes), exposé sur `/api-docs` (titre interne : **« NBN+ API »**).

---

## 2. Frontend

### 2.1 Stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, composants shadcn/ui (style **new-york**, base color neutral) construits sur Radix UI, `axios` + `js-cookie` pour les appels API, `next-themes` pour le thème clair/sombre, `@vercel/analytics`.

### 2.2 Structure de dossiers

```
Frontend/
├── app/                     → routes (App Router)
│   ├── layout.tsx            → layout racine (ThemeProvider, polices Geist, Analytics)
│   ├── page.tsx               → page d'accueil publique
│   ├── auth/                  → layout + pages login/register/forgot-password
│   └── dashboard/              → layout (sidebar) + pages protégées
│       ├── page.tsx, rentals/, sales/, favorites/, gallery/, search/, settings/, users/
├── actions/                 → fonctions client d'appel à l'API backend (axios)
├── components/
│   ├── ui/                    → primitives shadcn/Radix (button, dialog, table, sidebar, ...)
│   ├── property-modals/        → modales add/edit/delete pour biens à louer/vendre
│   ├── user-modals/             → modales add/edit/delete utilisateurs
│   ├── ProtectedRoute.tsx        → garde d'accès côté client
│   ├── theme-provider.tsx / theme-toggle.tsx
├── lib/                      → axios.ts, auth.ts, mock-data.ts, types.ts, utils.ts
├── hooks/                    → useAuth.ts, use-mobile.ts, use-toast.ts
├── types/type.ts              → types partagés (User, Auth, AuthPayload...)
└── proxy.ts                  → protection des routes au niveau edge (Next.js 16)
```

### 2.3 Routage et protection des routes

- `app/auth/*` : pages publiques (login, register, forgot-password), sous leur propre `layout.tsx`
- `app/dashboard/*` : pages protégées, sous [dashboard/layout.tsx](Frontend/app/dashboard/layout.tsx) qui affiche la sidebar (navigation, infos utilisateur lues depuis `localStorage`, bouton déconnexion)
- [proxy.ts](Frontend/proxy.ts) : équivalent du `middleware.ts` classique sous la convention Next.js 16 (fonction `proxy` + export `config.matcher`). Redirige vers `/auth/login` si la route commence par `/dashboard` et qu'aucun cookie `token` n'est présent ; redirige vers `/dashboard` si l'utilisateur est déjà connecté et tente d'accéder à une route d'auth. **Cette vérification ne fait que constater la présence du cookie, elle ne valide pas le JWT.**
- [ProtectedRoute.tsx](Frontend/components/ProtectedRoute.tsx) et [useAuth.ts](Frontend/hooks/useAuth.ts) : garde côté client redondante, qui appelle `GET /api/auth/profile` pour confirmer l'authentification et vérifier `allowedRoles` le cas échéant — **non branchée actuellement** dans `dashboard/layout.tsx` (le wrapping `<ProtectedRoute>` y est commenté)

### 2.4 Communication avec le backend

- [lib/axios.ts](Frontend/lib/axios.ts) : instance axios unique, `baseURL` = `NEXT_PUBLIC_API_URL`, `withCredentials: true`, intercepteur de requête qui ajoute `Authorization: Bearer <token>` à partir du cookie `token` (lu via `js-cookie`) ; un bloc de refresh-token est présent en commentaire mais non actif
- [actions/auth.ts](Frontend/actions/auth.ts) : `login`, `logout` — pose le cookie `token` et `localStorage.user` après connexion
- [actions/users.ts](Frontend/actions/users.ts) : **fichier vide**, pas de fonctions d'appel API pour les utilisateurs malgré la présence des pages/modales correspondantes
- [lib/auth.ts](Frontend/lib/auth.ts) : helpers `getAuthHeaders`, `getAuthUser`, `logout`

### 2.5 Données affichées

Les pages `dashboard/sales` et `dashboard/rentals` initialisent leur état React à partir de [lib/mock-data.ts](Frontend/lib/mock-data.ts) (`mockSales`, etc.) plutôt que d'appeler une API `properties` — cohérent avec le fait que les routes `property` ne sont pas encore exposées côté backend (§1.6).

### 2.6 Système de composants

- `components/ui/` : bibliothèque shadcn/ui complète (accordion, dialog, table, sidebar, form, chart, calendar, carousel, etc.), générée/configurée via [components.json](Frontend/components.json)
- `components/property-modals/` et `components/user-modals/` : modales métier (ajout/édition/suppression) construites sur les primitives `ui/`
- Thème clair/sombre via `next-themes`, activé par défaut en mode clair (`defaultTheme="light"`)

### 2.7 Points d'attention (dette technique visible)

- `next.config.mjs` désactive les erreurs de build TypeScript (`ignoreBuildErrors: true`) et l'optimisation d'images Next (`images.unoptimized: true`)
- [lib/auth.ts](Frontend/lib/auth.ts) → `isAuthenticated()` compare le cookie `token` à la chaîne littérale `"true"`, ce qui ne correspond pas au JWT réellement stocké — fonction probablement obsolète/à corriger
- Double gestion du cookie `token` : posé en `httpOnly` côté serveur (Express) **et** réécrit côté client par `actions/auth.ts` via `js-cookie` (non `httpOnly`) — à clarifier

---

## 3. Mobile

### 3.1 Stack
Expo SDK 54, Expo Router (routage par fichiers), React Native 0.81 (New Architecture activée), React 19, TypeScript, `react-native-reanimated`/`react-native-worklets`, `@react-navigation` (bottom-tabs, native).

### 3.2 État actuel

Le projet est **le squelette généré par `create-expo-app`**, sans aucun écran ni logique métier NBN Express. Structure présente :

```
Mobile/
├── app/
│   ├── _layout.tsx            → Stack racine (ThemeProvider React Navigation, StatusBar)
│   ├── (tabs)/
│   │   ├── _layout.tsx          → navigation par onglets (Home, Explore)
│   │   ├── index.tsx             → écran d'accueil de démo
│   │   └── explore.tsx           → écran de démo (documentation Expo)
│   └── modal.tsx                → écran modal de démo
├── components/                 → composants de démo réutilisables : themed-text, themed-view,
│                                   parallax-scroll-view, haptic-tab, hello-wave, external-link,
│                                   ui/collapsible, ui/icon-symbol(.ios)
├── hooks/                       → use-color-scheme(.web), use-theme-color
└── constants/theme.ts            → palette de couleurs claire/sombre
```

- Routage : `Stack` racine avec deux entrées, `(tabs)` (groupe de routes en onglets) et `modal`
- Thème : `useColorScheme` + `Colors` ([constants/theme.ts](Mobile/constants/theme.ts)) pilotent le thème clair/sombre à la fois pour React Navigation et les composants `themed-*`
- **Aucune** couche réseau, aucun client API, aucune authentification, aucun écran métier (biens, clients, tâches...) n'existe à ce stade
- `AGENTS.md` du dossier rappelle qu'Expo a changé récemment et qu'il faut se référer à la doc versionnée v54 avant d'écrire du code

---

## 4. Communication entre les sous-projets

- Le Backend expose son API REST sous `HOST_URL`, avec une liste blanche CORS qui inclut explicitly `http://localhost:3000`, `http://127.0.0.1:3000`, `http://127.0.0.1:5500` et `https://nbn-plus.vercel.app`
- Le Frontend consomme cette API via `NEXT_PUBLIC_API_URL` (variable d'environnement) à travers l'instance axios unique de [lib/axios.ts](Frontend/lib/axios.ts)
- Le Mobile ne communique avec aucun backend pour l'instant (aucune configuration réseau présente)
- Aucun package ou type partagé n'existe entre Backend / Frontend / Mobile : chaque application redéfinit ses propres types (ex. `User` existe indépendamment dans [Frontend/types/type.ts](Frontend/types/type.ts) et dans le modèle Sequelize du backend)
