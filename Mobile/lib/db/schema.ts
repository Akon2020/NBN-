import type { SQLiteDatabase } from 'expo-sqlite';

// MOBILE-G04 — schéma local minimal (CLAUDE.md §9, Repository pattern).
// Le payload d'un draft est stocké en JSON plutôt que d'être normalisé
// colonne par colonne : la structure exacte (champs bien / champs client)
// varie selon `type`, et la dupliquer ici alourdirait le schéma local pour
// un bénéfice nul (la validation métier reste de toute façon côté Backend
// au moment de la synchronisation, jamais dupliquée localement).
export async function initSchema(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS draft_missions (
      uuid TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      createdAt TEXT NOT NULL,
      syncedAt TEXT,
      serverIdProperty INTEGER,
      serverIdClient INTEGER,
      serverIdMission INTEGER,
      errorMessage TEXT
    );

    CREATE TABLE IF NOT EXISTS draft_photos (
      id TEXT PRIMARY KEY NOT NULL,
      missionUuid TEXT NOT NULL,
      localUri TEXT NOT NULL,
      hash TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (missionUuid) REFERENCES draft_missions(uuid) ON DELETE CASCADE
    );
  `);
}
