import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { initSchema } from './schema';

const DB_NAME = 'nbn-terrain.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

// Instance unique, initialisée paresseusement — évite d'ouvrir/migrer la
// base plusieurs fois si plusieurs écrans montent le Repository en
// parallèle (CLAUDE.md §9 : le Local Data Source reste un détail
// d'implémentation, jamais exposé directement à l'UI).
export function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DB_NAME).then(async (db) => {
      await initSchema(db);
      return db;
    });
  }
  return dbPromise;
}
