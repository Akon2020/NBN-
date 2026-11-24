# Frontend — NBN Express Plus

Dashboard web interne de NBN Express : gestion des biens, CRM clients et
bailleurs, pilotage des commissionnaires, trésorerie, tâches, alertes et
reporting.

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 ·
shadcn/ui · Socket.IO

## Démarrage

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL
npm run dev
```

Le dashboard tourne sur `http://localhost:3000` et attend l'API sur
`NEXT_PUBLIC_API_URL` (`http://localhost:5500` par défaut). Démarrer le
Backend en premier.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Sert le build de production |
| `npm run lint` | ESLint |
| `npm test` | Tests (vitest + @testing-library/react) |

## Pages publiques

Toutes les pages sous `app/dashboard/` exigent un compte. Trois pages sont
accessibles sans authentification :

| Route | Accès |
|---|---|
| `/` | Vitrine publique de l'agence |
| `/demande-location` | Formulaire de demande de location, référencé depuis la vitrine |
| `/collecte-bien` | Formulaire de collecte terrain — **usage interne, volontairement non référencé** côté client |

## Structure

```
app/          routes (App Router) ; app/dashboard/ = espace authentifié
actions/      appels à l'API, un fichier par domaine — seul endroit qui parle réseau
components/   composants métier ; components/ui/ = primitives shadcn
lib/          types.ts (contrat API), axios.ts, socket.ts, auth.ts, utils
hooks/        hooks React partagés
tests/        tests unitaires
```

Les composants ne font jamais d'appel réseau directement : ils passent par
`actions/`, ce qui garde la gestion d'erreur et le typage au même endroit.

## Conventions

- **Autorisation** : le Backend décide, le Frontend n'affiche que ce qu'il a
  reçu. Une page qui reçoit un 403 affiche un état « accès non autorisé »,
  elle ne réimplémente jamais la règle de permission (CLAUDE.md §2.2).
- **`lib/types.ts`** reflète le contrat Swagger du Backend. Il est aligné
  manuellement : toute évolution d'un endpoint doit y être répercutée.
- **Temps réel** : Socket.IO ne sert qu'à déclencher un rafraîchissement, il
  ne transporte jamais la donnée métier. Tout reste fonctionnel sans lui.
- **Images** : l'hôte qui sert les fichiers uploadés doit être déclaré dans
  `next.config.mjs` (`images.remotePatterns`), sinon `next/image` les refuse.
  `api.nbnexpress.org` et `localhost:5500` y sont déjà.
- **TypeScript strict**, sans `ignoreBuildErrors`. Un build qui ne compile pas
  est un build cassé.

## Production

`NEXT_PUBLIC_API_URL=https://api.nbnexpress.org`. Le site est servi sur
`https://nbnexpress.org` (cPanel, Passenger), seule origine autorisée par le
CORS du Backend avec `https://www.nbnexpress.org`.

### HTTPS obligatoire (connexion sur iPhone)

Le site répondait aussi en `http://nbnexpress.org` sans redirection. Safari
iOS ne force pas HTTPS sur ce domaine : la page s'ouvrait en HTTP, l'API
refusait cette origine, et la connexion affichait « Serveur injoignable ».

- `proxy.ts` redirige toute requête HTTP vers HTTPS (308), d'après
  l'en-tête `x-forwarded-proto` posé par le proxy du cPanel ;
- un script dans `app/layout.tsx` fait la même chose côté navigateur si
  l'en-tête manque ;
- `next.config.mjs` envoie `Strict-Transport-Security` (1 an) : après une
  première visite en HTTPS, le navigateur n'essaie plus jamais HTTP.

À activer aussi côté hébergement : cPanel > Domaines > « Forcer la
redirection HTTPS » pour `nbnexpress.org` et `www.nbnexpress.org`.

### Ancien déploiement Vercel

`nbn-plus.vercel.app` est une ancienne version du site, plus reliée à l'API
(retirée des origines autorisées) mais encore en ligne, et c'est vers elle
que pointaient les e-mails de bienvenue. À supprimer ou à protéger par mot
de passe dans le tableau de bord Vercel.
