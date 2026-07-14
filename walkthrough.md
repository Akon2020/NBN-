# walkthrough.md — Journal d'exécution du plan (plan.md)

Ce fichier journalise, session par session, ce qui a été réellement implémenté par rapport à la roadmap de `plan.md`. Il complète (sans le remplacer) l'historique Git — l'objectif est de pouvoir reprendre le travail sans avoir à relire tous les diffs.

---

## Session 1 — 2026-07-14 — Milestone 0 (Backend + ADMIN-G01 + QA-G01)

Contexte au démarrage : `CLAUDE.md` et `plan.md` venaient d'être rédigés (aucun code du plan n'était encore implémenté). Objectif de la session : démarrer M0, en priorisant le Backend (chemin critique explicite du plan) puis le garde de rôle Frontend.

### ✅ SEC-G01 — Authentification par cookie corrigée
- `cookie-parser` enregistré dans `Backend/app.js`.
- `authMiddlware` lit désormais le cookie `token` (au lieu du cookie inexistant `loginToken`), aligné avec ce que posent `register`/`login`.
- Vérifié par test d'intégration (`Backend/tests/auth.test.js`) : login → accès à `/api/auth/profile` avec le cookie seul, sans header `Authorization`.

### ✅ SEC-G02 — Garde de rôle minimal sur `/api/users`
- Middleware `requireRole(...roles)` ajouté dans `auth.middleware.js`.
- Appliqué à `POST /api/users/add`, `PATCH /api/users/update/:id`, `DELETE /api/users/delete/:id` (rôle `admin` requis).
- **Écart positif par rapport au texte littéral du Goal** : en creusant, `POST /api/auth/register` (public, non authentifié) acceptait un champ `role` fourni par le client — n'importe qui pouvait donc s'auto-déclarer `admin` à l'inscription, ce qui aurait rendu la garde ci-dessus inutile. Corrigé : l'auto-inscription force désormais toujours `role = "agent"`. Les rôles privilégiés ne sont attribuables que par un admin via `/api/users/add`.
- **Conséquence directe** : plus aucun moyen de créer le tout premier compte admin via l'API. Un seeder `Backend/seeders/20260714000000-seed-default-admin.cjs` a été ajouté pour amorcer un compte `admin@nyumbaniexpress.com` avec le mot de passe `DEFAULT_PASSWD` (déclenche naturellement le flux « mot de passe par défaut à changer » déjà présent dans `login`). Exécuté une fois en local (`npm run db:seed`).

### ✅ SEC-G03 — Statut utilisateur vérifié à l'authentification
- `authMiddlware` renvoie 401 si `user.status === "INACTIVE"`, même avec un jeton encore valide.

### ✅ SEC-G04 — Bugs de `property.controller.js` corrigés
- Alias Sequelize manquant : `Property.hasOne(PropertyScore, { as: "scores" })` ajouté dans `models/index.model.js` (les `include` du contrôleur l'utilisaient déjà sans qu'il existe).
- `deleteProperty` utilisait la mauvaise colonne FK (`propertyId` au lieu de `idProperty`) pour supprimer images/téléphones/scores — corrigé, suppression en cascade désormais effective.
- `getPropertiesByStatut` retiré : il filtrait sur un champ `statut` qui n'existe pas encore sur le modèle `Property`. À recréer proprement en **M2 (BACK-G05)** une fois le vrai champ ENUM ajouté.

### ✅ SEC-G05 — Secrets retirés de `config.json`
- `Backend/config/config.json` (mots de passe en clair, y compris pour `production`) supprimé.
- Remplacé par `Backend/config/config.cjs`, qui lit les identifiants DB depuis les variables d'environnement (`.env.<env>.local`) via `dotenv`.
- Sequelize CLI n'utilise plus `.sequelizerc` (incompatible avec `"type": "module"` du `package.json` sous Node 22+/26 — `require` y échoue). Les scripts `db:*` de `package.json` passent désormais explicitement `--config config/config.cjs`.
- `JWT_SECRET` local **rotaté** (l'ancien était exposé dans l'historique Git via le commit `danger:env files pushed`).
- Fichier mort supprimé : `Backend/models/index.js` (boilerplate `sequelize init` jamais importé nulle part, qui référençait l'ancien `config.json`).
- **Action manuelle restante pour l'utilisateur** (hors de portée d'un agent) : faire tourner le mot de passe d'application Gmail (`EMAIL_PASSWORD`) si jugé nécessaire, et évaluer si l'historique Git doit être réécrit pour purger les anciens secrets commités (non fait ici — action destructive qui requiert une décision explicite).

### ✅ SEC-G06 — Restrictions d'upload multer
- Whitelist MIME (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) et limite de 5 Mo/fichier ajoutées à `upload.middleware.js`, indépendantes de la limite globale `body-parser` (1024 Mo, qui reste pour les gros payloads JSON).
- `error.middleware.js` traduit désormais les `MulterError` en réponse 400 claire au lieu d'un 500 générique.

### ✅ SEC-G07 — `helmet` activé + rate limiting
- `helmet()` monté globalement dans `app.js`.
- `express-rate-limit` installé ; `authLimiter` (10 requêtes / 15 min) appliqué sur `POST /api/auth/login` et `POST /api/auth/register`.

### ✅ ADMIN-G01 — Garde de rôle Frontend + `next.config.mjs` + unification du cookie
- `next.config.mjs` : `typescript.ignoreBuildErrors` et `images.unoptimized` retirés. `npm run build` passe intégralement en TypeScript strict.
- Deux erreurs TypeScript révélées et corrigées (`app/dashboard/page.tsx`, plus généralement le pattern `JSON.parse(localStorage.getItem(...))` non null-safe).
- **Unification du cookie** (le vrai sujet derrière l'ADMIN-G01) : le jeton ne vit plus que dans le cookie `httpOnly` posé par le backend.
  - `actions/auth.ts` : suppression de la copie cliente du cookie via `js-cookie` (elle ne fonctionnait de toute façon pas contre un cookie `httpOnly` — c'est la cause probable du bug déjà repéré dans `arch.md` sur `isAuthenticated()`).
  - `lib/axios.ts` : suppression de l'intercepteur qui tentait de relire ce cookie pour reconstruire un header `Authorization` ; `withCredentials: true` suffit.
  - `lib/auth.ts` : `getAuthHeaders()` et `isAuthenticated()` supprimées (mortes/cassées) ; seul `getAuthUser()` (lecture `localStorage`, affichage uniquement) est conservé.
  - `ProtectedRoute.tsx`, `useAuth.ts`, `app/auth/layout.tsx` : appellent `/api/auth/profile` sans header manuel — l'authentification se décide uniquement côté backend.
  - **Bug de logique corrigé au passage** dans `app/auth/layout.tsx` : le code lisait `user.role` sur l'objet de réponse complet (`{ user, authenticated }`) au lieu de `response.data.user.role` — la redirection « déjà connecté » ne pouvait jamais fonctionner.
  - `dashboard/layout.tsx` : `<ProtectedRoute allowedRoles={["admin", "agent"]}>` décommenté. Le bouton déconnexion appelle maintenant `actions/auth.logout()` (qui appelle réellement le backend pour effacer le cookie `httpOnly`) au lieu de l'ancien `lib/auth.logout()` qui ne faisait que nettoyer le `localStorage` — **la déconnexion ne déconnectait donc pas vraiment côté serveur avant ce correctif**.

### ✅ QA-G01 — Outillage de test (Backend / Frontend / Mobile)
- **Backend** : `vitest` + `supertest`. `Backend/app.js` a été séparé de `Backend/server.js` (le premier construit et exporte l'app Express, le second fait `app.listen`) — nécessaire pour que `supertest` puisse tester l'app sans bind réseau réel. `package.json` (`main`, `start`, `dev`) mis à jour en conséquence. 7 tests dans `tests/auth.test.js` + `tests/health.test.js`, couvrant SEC-G01/G02/G03 de bout en bout contre la vraie base `nbn` locale (nettoyage automatique des utilisateurs de test après chaque run).
- **Frontend** : `vitest` + `@testing-library/react` + `jsdom`. Contournement nécessaire : Node 22+/26 expose un global `localStorage` expérimental cassé qui masque celui de jsdom sous Vitest 4 → polyfill mémoire dans `vitest.setup.ts`. 3 tests passent (`lib/auth.test.ts`, `components/button.test.tsx`).
- **Mobile** : `jest-expo` + `@testing-library/react-native` (installés via `npx expo install` pour garantir la compatibilité de versions). Point notable : `@testing-library/react-native` v14 (celle compatible React 19 / Expo 54) a un `render()` **désormais asynchrone** (`await render(...)`) — non documenté dans les habitudes précédentes, à garder en tête pour tout futur test Mobile. 1 test passe (`themed-text.test.tsx`).
- **CI** : trois workflows GitHub Actions séparés et déclenchés uniquement par dossier modifié (`backend-ci.yml`, `frontend-ci.yml`, `mobile-ci.yml`), conformément à `CLAUDE.md` §12. Le job Backend démarre un service MySQL, applique les migrations puis lance les tests. Non vérifié en conditions réelles (nécessite un push/PR sur GitHub) — seule l'exécution locale des trois suites de tests a été validée.

### ⬜ Non commencé dans cette session
- **MOBILE-G01** (squelette de navigation par rôle) — le Mobile reste le squelette Expo par défaut en dehors de l'ajout de l'outillage de test.
- **DESIGN-G01** (tokens de design system Tailwind/NativeWind) — pas commencé.
- Lint Backend et Frontend : `eslint` est présent en dépendance mais aucune configuration fonctionnelle n'existe pour l'un ou l'autre (`Backend` n'a même pas de script `lint`). Pas dans la liste explicite des Goals M0, donc non traité ici — à faire si CLAUDE.md §12 doit être respecté à la lettre.

### Vérifications effectuées
- `Backend` : boot propre (`node server.js`), en-têtes `helmet` et `RateLimit-*` confirmés par `curl`, `npm test` → 7/7 passent.
- `Frontend` : `npm run build` passe en TypeScript strict avec images optimisées, `npm test` → 3/3 passent.
- `Mobile` : `npm run lint` propre, `npm test` → 1/1 passe.

### Décisions à documenter/valider par l'utilisateur
1. **Réécriture de l'historique Git** pour purger les anciens secrets (`JWT_SECRET`, `EMAIL_PASSWORD`, mots de passe DB) commités via `danger:env files pushed` : non effectuée (action destructive). Le secret JWT a été rotaté localement, ce qui neutralise le risque pratique pour ce secret précis, mais l'historique reste inchangé.
2. Le compte admin par défaut (seeder) a pour mot de passe `DEFAULT_PASSWD` — à changer immédiatement après la première connexion (le flux existant l'impose déjà).

---

*Prochaine session suggérée : compléter M0 (MOBILE-G01, DESIGN-G01), puis démarrer M1 (Identity/Authorization/Organization) qui est le prérequis de tout le reste du plan.*
