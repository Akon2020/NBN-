# Backend — NBN Express Plus

API REST du système NBN Express. Monolithe **modulaire** : chaque domaine
métier reste isolé et communique par des interfaces explicites et un event bus
interne, jamais par accès direct aux modèles d'un autre domaine.

Node.js (ESM) · Express 5 · Sequelize 6 · MySQL 8 · Socket.IO

## Démarrage

Prérequis : Node.js 20+ et une base MySQL 8 accessible.

```bash
npm install
cp .env.example .env.development.local   # puis renseigner les valeurs réelles
npm run db:migrate
npm run db:seed
npm run dev
```

L'API écoute sur le port défini par `PORT` (5500 par défaut). La
documentation interactive est servie sur **`/api-docs`** — c'est le contrat de
référence pour le Frontend et le Mobile (CLAUDE.md §9) : toute modification
d'endpoint doit y être répercutée avant ou avec le changement de code, jamais
après.

## Configuration

Les variables sont chargées depuis `.env.${NODE_ENV}.local`. Voir
[`.env.example`](.env.example) pour la liste complète et commentée.

Aucune valeur de configuration n'est codée en dur dans le code métier : durées
de jetons, délais SMTP, tailles d'upload et origines CORS sont toutes des
variables d'environnement avec un défaut documenté.

### Origines autorisées

`CORS_ORIGINS` (valeurs séparées par des virgules) surcharge la liste par
défaut définie dans `app.js` — les domaines `nbnexpress.org`,
`www.nbnexpress.org`, `api.nbnexpress.org` et `nbn-plus.vercel.app`.

En développement, tout `localhost`/`127.0.0.1` et toute IP LAN privée
(`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`) est accepté automatiquement :
Expo Metro change de port à chaque redémarrage et un appareil physique se
présente avec l'IP LAN de la machine de dev, jamais avec `localhost`.

### Derrière un reverse proxy

En production (cPanel), l'API est servie derrière un proxy. `TRUST_PROXY`
indique combien de proxies précèdent l'application — `1` par défaut en
production. Sans ce réglage, `req.ip` vaut l'adresse du proxy pour **tous**
les utilisateurs : ils partagent alors le même quota de connexion (10
tentatives / 15 min) et se bloquent mutuellement.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Démarrage en développement (nodemon) |
| `npm start` | Démarrage en production |
| `npm run db:migrate` | Applique les migrations |
| `npm run db:seed` | Applique les seeders (catalogue RBAC, permissions, admin par défaut) |
| `npm run db:reset` | Annule tout, remigre, reseede |
| `npm run admin:create` | Crée ou promeut un compte administrateur (voir ci-dessous) |
| `npm test` | Suite de tests (vitest + supertest) |

### Créer le premier administrateur

```bash
npm run admin:create -- "Nom Complet" admin@nbnexpress.org "MotDePasse1!"
```

Si le compte existe déjà, il est promu `admin`, réactivé, et son mot de passe
réinitialisé. Dans ce cas les sessions ouvertes sont révoquées et
`securityVersion` est incrémenté — un jeton dérobé ne survit donc pas à la
reprise en main du compte.

Le mot de passe doit faire 6 caractères minimum avec au moins une lettre, un
chiffre et un caractère spécial. `DEFAULT_PASSWD` est refusé : la connexion le
rejette tant qu'il n'est pas changé, ce qui produirait un admin inutilisable.

## Tests

37 fichiers de tests d'intégration exécutés contre une **vraie base MySQL**,
sans mocks : ils exercent les migrations, le RBAC, les règles métier et les
effets de bord réels (event bus, outbox, timeline).

```bash
npm test                       # tout
npx vitest run tests/rbac.test.js   # un fichier
```

Renseigner `.env.development.local` avant : les tests utilisent la base de
développement, considérée comme jetable (CLAUDE.md §2 point 10).

## Structure

```
config/       env, base de données, nodemailer, swagger
controllers/  logique HTTP par domaine
database/     connexion Sequelize
middlewares/  authentification, RBAC, upload, rate limiting, erreurs
migrations/   67 migrations versionnées — seule source de vérité du schéma
models/       modèles Sequelize et leurs associations (index.model.js)
routes/       définition des routes + annotations Swagger
scripts/      outils en ligne de commande (création d'admin)
seeders/      catalogue RBAC, permissions par rôle, données de référence
services/     services métier et workers (outbox, rappels)
shared/       event bus, timeline, calcul de marge, passerelle temps réel
utils/        sérialiseurs, RBAC, sessions, helpers
```

Toute modification de schéma passe par une migration versionnée — jamais par
`db.sync({ alter: true })` (CLAUDE.md §13).

## Points d'attention

- **Autorisation** : le Backend est la seule autorité. Chaque route sensible
  passe par `requirePermission`, et les champs sensibles (marge d'un bien,
  données financières) sont filtrés dans la couche de sérialisation selon les
  permissions effectives de l'appelant.
- **E-mails** : l'envoi est borné dans le temps (`MAIL_TIMEOUT_MS`). Un SMTP
  injoignable n'empêche jamais la création d'un compte ni ne retient la
  requête appelante — l'échec est signalé via `emailStatus` dans la réponse.
- **Écritures financières** : append-only. Une correction se fait par
  contre-écriture, jamais par modification silencieuse.
- **Pièces d'identité** : stockées dans `IDENTITY_DOCUMENTS_DIR`
  (`private/identity-documents` par défaut), **hors** de `uploads/` qui est
  servi publiquement. Les images sont réencodées en JPEG (EXIF et position GPS
  retirés). Consultation uniquement via `GET /api/bailleurs/:id/piece-identite`
  (`bailleurs:identity:read`, admin par défaut) ; la fiche n'expose que
  `person.hasIdDocument`. Ce dossier n'est pas versionné : **l'inclure dans les
  sauvegardes du serveur**.

## E-mails

| Usage | Configuration |
|---|---|
| E-mails applicatifs (bienvenue, mot de passe, accusés de réception, notifications d'équipe) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`. `SMTP_HOST` vide = compte Gmail `EMAIL` / `EMAIL_PASSWORD` (développement). |
| Boîtes professionnelles relevées et utilisées pour répondre (contact@, direction@…) | `MAILBOXES` + `MAILBOX_<CLÉ>_*`, voir [`config/mailboxes.js`](config/mailboxes.js) et [`.env.example`](.env.example). |

Les e-mails déclenchés par un formulaire ne sont **jamais envoyés pendant la
requête** : ils passent par l'outbox (`email:send`), et le worker les retente
jusqu'à 5 fois. Un SMTP en panne ne fait donc ni échouer une soumission, ni
perdre un accusé de réception.

**Relève des boîtes** (`services/inboundMail.service.js`) : toutes les 2 minutes
(`INBOUND_MAIL_POLL_CRON`), chaque boîte avec identifiants est lue en IMAP **en
lecture seule** — les messages restent non lus dans le webmail. La première
relève fixe un point de départ (pas d'import de l'historique). Chaque nouveau
message devient une copie consultable dans « Messages reçus » et une
notification pour l'audience de la boîte ; la réponse part depuis la boîte
elle-même, dans le même fil. Un message hors de l'audience de l'utilisateur
répond 404 (la direction reste confidentielle, y compris vis-à-vis de l'admin).

En développement avec Gmail : activer la validation en 2 étapes du compte, créer
un **mot de passe d'application** (`EMAIL_PASSWORD`), et autoriser l'accès IMAP
si la boîte `contact` relève ce compte (`MAILBOX_CONTACT_USE_DEFAULT_ACCOUNT=true`).

## Déploiement cPanel — démarrage lent

Sur cPanel, Phusion Passenger **arrête l'application après une période sans
requête** (5 minutes par défaut) pour libérer la mémoire. La requête suivante
doit relancer Node, charger Sequelize et ouvrir la connexion MySQL : plusieurs
secondes (5 s mesurées sur `api.nbnexpress.org`), parfois assez pour qu'un
téléphone sur réseau faible abandonne et affiche « Serveur injoignable ». Le
dashboard Next.js, servi lui aussi par Passenger, subit le même réveil.

Ce n'est pas corrigeable dans le code — c'est un réglage d'hébergement. Par
ordre de préférence :

1. **Garder un processus vivant.** Dans `.htaccess` de l'API et du dashboard
   (ou via le support de l'hébergeur si les directives sont verrouillées) :

   ```apache
   PassengerMinInstances 1
   PassengerPoolIdleTime 0
   ```

2. **À défaut, un moniteur externe** qui appelle `GET https://api.nbnexpress.org/`
   et `GET https://nbnexpress.org/` toutes les 5 minutes (UptimeRobot, Better
   Stack… offres gratuites suffisantes). Il empêche la mise en veille et
   prévient en cas de panne réelle. Une tâche cron *interne* à l'application ne
   fonctionne pas : elle s'arrête avec le processus qu'elle devait réveiller.
