import { getDatabase } from '../db/database';
import { generateUuid } from '../uuid';
import type { DraftMission, DraftPayload, DraftStatus, MissionType } from '../missions';

// CLAUDE.md §9 — seul point d'entrée que l'UI consomme ; elle ne connaît
// jamais expo-sqlite directement (le moteur de stockage local reste un
// détail d'implémentation, remplaçable sans toucher aux composants UI).

interface DraftMissionRow {
  uuid: string;
  type: MissionType;
  payload: string;
  status: DraftStatus;
  createdAt: string;
  syncedAt: string | null;
  serverIdProperty: number | null;
  serverIdClient: number | null;
  serverIdMission: number | null;
  errorMessage: string | null;
}

const rowToDraft = (row: DraftMissionRow): DraftMission => ({
  ...row,
  payload: JSON.parse(row.payload) as DraftPayload,
});

export async function createDraftMission(
  type: MissionType,
  payload: DraftPayload
): Promise<DraftMission> {
  const db = await getDatabase();
  const uuid = generateUuid();
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO draft_missions (uuid, type, payload, status, createdAt) VALUES (?, ?, ?, 'PENDING', ?)`,
    [uuid, type, JSON.stringify(payload), createdAt]
  );

  return {
    uuid,
    type,
    payload,
    status: 'PENDING',
    createdAt,
    syncedAt: null,
    serverIdProperty: null,
    serverIdClient: null,
    serverIdMission: null,
    errorMessage: null,
  };
}

export async function getDraftMissions(): Promise<DraftMission[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DraftMissionRow>(
    `SELECT * FROM draft_missions ORDER BY createdAt DESC`
  );
  return rows.map(rowToDraft);
}

export async function getPendingDraftMissions(): Promise<DraftMission[]> {
  const db = await getDatabase();
  // FIFO strict (CLAUDE.md §8) — l'ordre de création est l'ordre de
  // synchronisation, jamais retraité en parallèle.
  const rows = await db.getAllAsync<DraftMissionRow>(
    `SELECT * FROM draft_missions WHERE status IN ('PENDING', 'FAILED') ORDER BY createdAt ASC`
  );
  return rows.map(rowToDraft);
}

export async function updateDraftMissionStatus(
  uuid: string,
  status: DraftStatus,
  extra: {
    serverIdProperty?: number;
    serverIdClient?: number;
    serverIdMission?: number;
    errorMessage?: string | null;
  } = {}
): Promise<void> {
  const db = await getDatabase();
  const syncedAt = status === 'SYNCED' ? new Date().toISOString() : null;
  await db.runAsync(
    `UPDATE draft_missions
     SET status = ?,
         syncedAt = COALESCE(?, syncedAt),
         serverIdProperty = COALESCE(?, serverIdProperty),
         serverIdClient = COALESCE(?, serverIdClient),
         serverIdMission = COALESCE(?, serverIdMission),
         errorMessage = ?
     WHERE uuid = ?`,
    [
      status,
      syncedAt,
      extra.serverIdProperty ?? null,
      extra.serverIdClient ?? null,
      extra.serverIdMission ?? null,
      extra.errorMessage ?? null,
      uuid,
    ]
  );
}

export async function addDraftPhoto(missionUuid: string, localUri: string, hash: string | null) {
  const db = await getDatabase();
  const id = generateUuid();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO draft_photos (id, missionUuid, localUri, hash, status, createdAt) VALUES (?, ?, ?, ?, 'PENDING', ?)`,
    [id, missionUuid, localUri, hash, createdAt]
  );
  return { id, missionUuid, localUri, hash, status: 'PENDING' as const, createdAt };
}

export async function getDraftPhotos(missionUuid: string) {
  const db = await getDatabase();
  return db.getAllAsync<{
    id: string;
    missionUuid: string;
    localUri: string;
    hash: string | null;
    status: string;
    createdAt: string;
  }>(`SELECT * FROM draft_photos WHERE missionUuid = ? ORDER BY createdAt ASC`, [missionUuid]);
}

export async function getPendingDraftPhotos(missionUuid: string) {
  const db = await getDatabase();
  return db.getAllAsync<{ id: string; missionUuid: string; localUri: string; hash: string | null }>(
    `SELECT * FROM draft_photos WHERE missionUuid = ? AND status IN ('PENDING', 'FAILED') ORDER BY createdAt ASC`,
    [missionUuid]
  );
}

export async function updateDraftPhotoStatus(id: string, status: string) {
  const db = await getDatabase();
  await db.runAsync(`UPDATE draft_photos SET status = ? WHERE id = ?`, [status, id]);
}

export async function deleteDraftPhoto(id: string) {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM draft_photos WHERE id = ?`, [id]);
}

export async function countPendingDrafts(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM draft_missions WHERE status IN ('PENDING', 'FAILED')`
  );
  return row?.count ?? 0;
}
