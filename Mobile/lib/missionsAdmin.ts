import { api } from './api';

// Missions réelles côté serveur (staff, écran de validation) — distinct de
// `lib/missions.ts` qui décrit les brouillons locaux SQLite du
// commissionnaire (type `DraftMission`, jamais confondu avec celui-ci).
export type ServerMissionType = 'COLLECTE_BIEN' | 'APPORT_CLIENT' | 'SUIVI';
export type ServerMissionStatut = 'SOUMISE' | 'VALIDEE' | 'REJETEE' | 'CORRECTION_DEMANDEE';

export const SERVER_MISSION_TYPE_LABELS: Record<ServerMissionType, string> = {
  COLLECTE_BIEN: 'Collecte de bien',
  APPORT_CLIENT: 'Apport client',
  SUIVI: 'Suivi',
};

export const SERVER_MISSION_STATUT_LABELS: Record<ServerMissionStatut, string> = {
  SOUMISE: 'Soumise',
  VALIDEE: 'Validée',
  REJETEE: 'Rejetée',
  CORRECTION_DEMANDEE: 'Correction demandée',
};

export interface ServerMission {
  idMission: number;
  type: ServerMissionType;
  statut: ServerMissionStatut;
  notes?: string | null;
  progression: number;
  commissionnaire?: { idCommissionnaire: number; person?: { fullName: string } };
  createdAt: string;
}

// GET /api/missions (missions:read) — pas de filtre statut côté Backend,
// filtrage effectué par l'appelant si besoin (même volume que le Frontend
// Admin, raisonnable pour ce module).
export async function getAllMissions(): Promise<ServerMission[]> {
  const res = await api.get('/api/missions');
  return res.data.data;
}
