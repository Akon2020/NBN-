# Mobile — NBN Express Plus

Application terrain et client de NBN Express : collecte de biens et de clients
par les commissionnaires, consultation du catalogue, suivi des missions,
tâches et tableau de bord interne.

Expo SDK 54 · React Native 0.81 · Expo Router · NativeWind · expo-sqlite

## Démarrage

```bash
npm install
npx expo start
```

Puis ouvrir sur un appareil via Expo Go, ou `npx expo start --android` /
`--ios`.

L'adresse de l'API est déduite automatiquement en développement : `lib/api.ts`
réutilise l'IP LAN de la machine qui sert le bundle Metro
(`Constants.expoConfig.hostUri`). Inutile de la configurer à chaque changement
de réseau — et `localhost` ne fonctionnerait pas depuis un appareil physique,
il désignerait l'appareil lui-même. Pour forcer une adresse, renseigner
`EXPO_PUBLIC_API_URL` (voir [`.env.example`](.env.example)).

> Les notifications push distantes ne fonctionnent pas dans Expo Go depuis le
> SDK 53. Le code les ignore proprement dans ce contexte ; il faut un build de
> développement (EAS ou local) pour les tester, ainsi qu'un `projectId` EAS
> encore à provisionner (CLAUDE.md §16 point 6).

## Scripts

| Commande | Effet |
|---|---|
| `npx expo start` | Serveur de développement Metro |
| `npm run android` / `npm run ios` | Démarre sur la plateforme ciblée |
| `npm run lint` | ESLint |
| `npm test` | Tests (jest) |

## Arborescences par rôle

La navigation est découpée en trois arbres, résolus au démarrage selon le rôle
du compte connecté (`lib/auth.ts`) :

| Arbre | Public | Contenu |
|---|---|---|
| `app/(client)/` | Client final, sans compte | Catalogue, recherche, carte, favoris, profil |
| `app/(commissionnaire)/` | Commissionnaires terrain | Missions, collecte, notifications, profil |
| `app/(interne)/` | Personnel et administration | Tableau de bord, biens, tâches, notifications |

`app/collecte/` regroupe les formulaires de collecte terrain (bien, client,
suivi), accessibles depuis l'arbre commissionnaire.

## Offline-first

La collecte terrain fonctionne **sans réseau**, ce n'est pas un cache
d'affichage :

```
UI  →  Repository (lib/repository/)   ← seule interface connue de l'UI
           ├── SQLite local (lib/db/)
           ├── API distante (lib/api.ts)
           └── Sync engine (lib/sync/)
```

- Chaque brouillon reçoit un **UUID généré localement**, ce qui rend la
  création idempotente côté serveur : une synchronisation rejouée après une
  coupure ne crée jamais de doublon.
- Le moteur de synchronisation traite les brouillons en **FIFO** et enregistre
  les identifiants serveur au fur et à mesure — une coupure en milieu de
  synchro reprend sans recréer ce qui existe déjà.
- Les **photos sont découplées** de la ressource : un échec d'upload ne rend
  jamais invalide la collecte du bien. Elles sont compressées et dédupliquées
  par hash avant stockage local.
- L'UI n'importe jamais `expo-sqlite` directement — uniquement le Repository,
  pour que le moteur de stockage reste remplaçable.

## Structure

```
app/          routes (Expo Router), une arborescence par rôle
components/   composants partagés (cartes, modales, sélecteurs)
lib/          api, auth, stockage sécurisé, db/, repository/, sync/, media/
constants/    thème et tokens de marque
__tests__/    tests jest (repository, moteur de synchronisation, rôles)
```

## Conventions

- **Jetons** dans `expo-secure-store` (Keychain/Keystore), jamais
  AsyncStorage. AsyncStorage n'est utilisé que pour de l'état non sensible
  (onboarding vu, favoris locaux du visiteur).
- **Formulaires** en `useState` par champ avec validation en ligne, appels
  réseau via des fonctions typées dans `lib/*.ts` — choix acté après
  implémentation réelle, documenté en CLAUDE.md §12.
- **Classification offline** : chaque fonctionnalité est offline-first,
  offline-readable ou online-only selon CLAUDE.md §8. Pas de comportement
  hors ligne improvisé en dehors de cette grille.
