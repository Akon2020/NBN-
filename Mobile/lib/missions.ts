export type MissionType = 'COLLECTE_BIEN' | 'APPORT_CLIENT' | 'SUIVI';
export type DraftStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
export type PhotoStatus = 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';

export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  COLLECTE_BIEN: 'Collecte de bien',
  APPORT_CLIENT: 'Apport client',
  SUIVI: 'Suivi',
};

export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  PENDING: 'En attente de synchronisation',
  SYNCING: 'Synchronisation en cours',
  SYNCED: 'Synchronisé',
  FAILED: 'Échec — action requise',
};

// Sous-ensemble de Backend/controllers/property.controller.js#PROPERTY_FIELDS
// pertinent pour une collecte terrain (CDC : type, adresse, chambres,
// prix, garantie, téléphones, géolocalisation optionnelle).
export interface BienPayload {
  category: 'RENT' | 'SALE';
  propertyType: string;
  quartier?: string;
  avenue?: string;
  floors?: number;
  bedrooms?: number;
  livingRooms?: number;
  toilets?: number;
  kitchens?: number;
  price?: number;
  description?: string;
  guarantee?: number;
  unit?: 'DAY' | 'MONTH' | 'YEAR';
  phones?: string[];
  latitude?: number;
  longitude?: number;
}

export interface ClientPayload {
  fullName: string;
  phone?: string;
  email?: string;
  type: 'LOCATAIRE' | 'ACHETEUR';
  sousType?: string;
  source?: string;
}

export interface SuiviPayload {
  notes: string;
}

export type DraftPayload = BienPayload | ClientPayload | SuiviPayload;

// `idCommissionnaire` n'est jamais stocké sur le draft : il est résolu au
// moment de la synchronisation via `/api/commissionnaires/me` (toujours le
// compte actuellement connecté sur l'appareil) plutôt que figé à la
// création, plus sûr si l'appareil change de titulaire entre-temps.
export interface DraftMission {
  uuid: string;
  type: MissionType;
  payload: DraftPayload;
  status: DraftStatus;
  createdAt: string;
  syncedAt: string | null;
  serverIdProperty: number | null;
  serverIdClient: number | null;
  serverIdMission: number | null;
  errorMessage: string | null;
}

export interface DraftPhoto {
  id: string;
  missionUuid: string;
  localUri: string;
  hash: string | null;
  status: PhotoStatus;
  createdAt: string;
}
