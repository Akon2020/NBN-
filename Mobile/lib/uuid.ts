import { randomUUID } from 'expo-crypto';

// CLAUDE.md §8 — UUID généré côté client dès la création locale, socle de
// l'idempotence terrain (une resoumission après coupure réseau ne doit
// jamais créer de doublon serveur, cf. Mission.uuid unique en Backend).
export const generateUuid = (): string => randomUUID();
