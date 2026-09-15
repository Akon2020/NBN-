# NBN Express Plus

Système digital interne de **NBN Express**, agence immobilière basée à Bukavu
(Sud-Kivu, RDC) : location, vente, conseil, accueil et déménagement.

L'outil combine une base de données métier structurée et un outil opérationnel
de terrain — gestion des biens, CRM clients et bailleurs, pilotage des
commissionnaires, trésorerie multi-caisses et multi-devises, tâches,
notifications et reporting.

## Les trois applications

Trois projets **indépendants** (pas de monorepo à workspace partagé). Le
contrat entre eux est maintenu via la documentation Swagger du Backend.

| Dossier | Rôle | Stack | Port dev |
|---|---|---|---|
| [`Backend/`](Backend/README.md) | API REST (monolithe modulaire) | Node.js (ESM), Express 5, Sequelize, MySQL | `5500` |
| [`Frontend/`](Frontend/README.md) | Dashboard web interne | Next.js 16, React 19, Tailwind v4, shadcn/ui | `3000` |
| [`Mobile/`](Mobile/README.md) | Application terrain et clients | Expo SDK 54, React Native, NativeWind | `8081` |

## Environnements

| | Développement | Production |
|---|---|---|
| API | `http://localhost:5500` | `https://api.nbnexpress.org` |
| Dashboard | `http://localhost:3000` | `https://nbnexpress.org` |
| Déploiement web | — | `https://nbn-plus.vercel.app` |

Chaque projet fournit un `.env.example` documentant ses variables. Les
fichiers `.env*.local` contiennent les vraies valeurs et ne sont **jamais**
versionnés.

## Démarrage rapide

Prérequis : Node.js 20+, MySQL 8, et npm.

```bash
# 1. API
cd Backend
cp .env.example .env.development.local   # puis renseigner DB, JWT_SECRET, e-mail
npm install
npm run db:migrate
npm run db:seed
npm run admin:create -- "Votre Nom" vous@nbnexpress.org "MotDePasse1!"
npm run dev

# 2. Dashboard web (dans un autre terminal)
cd Frontend
cp .env.example .env.local
npm install
npm run dev

# 3. Application mobile (dans un autre terminal)
cd Mobile
npm install
npx expo start
```

La documentation interactive de l'API est servie sur
`http://localhost:5500/api-docs`.

## Tests

Chaque projet a sa propre suite, exécutée en CI par dossier modifié
(`.github/workflows/`).

```bash
cd Backend  && npm test    # vitest + supertest, sur une vraie base MySQL
cd Frontend && npm test    # vitest + @testing-library/react
cd Mobile   && npm test    # jest (repository, moteur de synchronisation)
```

Les tests Backend tournent contre une base réelle, sans mocks : renseigner
`.env.development.local` avant de les lancer.

## Documentation

- **[`CLAUDE.md`](CLAUDE.md)** — architecture, décisions validées, conventions
  et politique de sécurité. C'est la référence qui fait autorité : en cas de
  contradiction avec un autre document, c'est elle qui prime.
- **[`plan.md`](plan.md)** — découpage en milestones et suivi d'avancement.
- **[`walkthrough.md`](walkthrough.md)** — journal des travaux réalisés,
  session par session.

## Contribution

Le travail se fait sur la branche `dev`. Un commit par fonctionnalité, avec un
message décrivant le problème résolu et non la liste des fichiers touchés.
