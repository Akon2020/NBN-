import { api } from '../api';
import {
  deleteDraftPhoto,
  getPendingDraftMissions,
  getPendingDraftPhotos,
  updateDraftMissionStatus,
  updateDraftPhotoStatus,
} from '../repository/missionRepository';
import { deleteLocalPhoto } from '../media/photoCompression';
import type { BienPayload, ClientPayload, DraftMission, SuiviPayload } from '../missions';

// CLAUDE.md §8 — moteur de synchronisation : FIFO strict, jamais de
// duplication même si la connexion tombe en plein milieu d'une
// synchronisation. Chaque étape réussie (création du bien/client, puis
// upload des photos, puis création de la mission) est persistée
// immédiatement sur le draft — une reprise après coupure ne rejoue jamais
// une étape déjà confirmée par le serveur.

let isSyncing = false;

export interface SyncSummary {
  synced: number;
  failed: number;
  stoppedOnNetworkError: boolean;
}

export async function syncPendingMissions(): Promise<SyncSummary> {
  if (isSyncing) {
    return { synced: 0, failed: 0, stoppedOnNetworkError: false };
  }
  isSyncing = true;

  const summary: SyncSummary = { synced: 0, failed: 0, stoppedOnNetworkError: false };

  try {
    const idCommissionnaire = await resolveCurrentCommissionnaireId();
    if (!idCommissionnaire) {
      return summary;
    }

    // Déjà trié par createdAt ASC (FIFO) par le Repository.
    const drafts = await getPendingDraftMissions();

    for (const draft of drafts) {
      const outcome = await syncOneDraft(draft, idCommissionnaire);
      if (outcome === 'synced') {
        summary.synced += 1;
      } else if (outcome === 'failed') {
        summary.failed += 1;
      } else {
        // Coupure réseau en cours de traitement : on s'arrête ici plutôt
        // que de sauter au draft suivant, pour respecter l'ordre FIFO au
        // prochain passage.
        summary.stoppedOnNetworkError = true;
        break;
      }
    }
  } catch {
    // Impossible de résoudre le profil commissionnaire (hors ligne dès le
    // départ, ou session invalide) : rien à synchroniser pour l'instant,
    // ce n'est pas une erreur à remonter à l'utilisateur.
  } finally {
    isSyncing = false;
  }

  return summary;
}

async function resolveCurrentCommissionnaireId(): Promise<number | null> {
  try {
    const res = await api.get('/api/commissionnaires/me');
    return res.data.idCommissionnaire;
  } catch {
    return null;
  }
}

type SyncOutcome = 'synced' | 'failed' | 'network-error';

// Pas de réponse du tout (coupure réseau) ou erreur serveur transitoire
// (5xx) : à retenter plus tard. Une erreur 4xx est un problème de données,
// jamais résolu par une nouvelle tentative automatique.
const isRetriable = (error: any) => !error?.response || error.response.status >= 500;

async function syncOneDraft(draft: DraftMission, idCommissionnaire: number): Promise<SyncOutcome> {
  await updateDraftMissionStatus(draft.uuid, 'SYNCING');

  try {
    let idProperty = draft.serverIdProperty ?? undefined;
    let idClient = draft.serverIdClient ?? undefined;

    if (draft.type === 'COLLECTE_BIEN' && !idProperty) {
      const payload = draft.payload as BienPayload;
      const propertyRes = await api.post('/api/properties', payload);
      idProperty = propertyRes.data.data.idProperty;
      await updateDraftMissionStatus(draft.uuid, 'SYNCING', { serverIdProperty: idProperty });
    }

    if (draft.type === 'APPORT_CLIENT' && !idClient) {
      const payload = draft.payload as ClientPayload;
      const clientRes = await api.post('/api/clients', payload);
      idClient = clientRes.data.data.idClient;
      await updateDraftMissionStatus(draft.uuid, 'SYNCING', { serverIdClient: idClient });
    }

    if (idProperty) {
      await uploadDraftPhotos(draft.uuid, idProperty);
    }

    const notes = draft.type === 'SUIVI' ? (draft.payload as SuiviPayload).notes : undefined;

    const missionRes = await api.post('/api/missions', {
      uuid: draft.uuid,
      idCommissionnaire,
      type: draft.type,
      idProperty,
      idClient,
      notes,
    });

    await updateDraftMissionStatus(draft.uuid, 'SYNCED', {
      serverIdMission: missionRes.data.data.idMission,
    });
    return 'synced';
  } catch (error) {
    if (isRetriable(error)) {
      await updateDraftMissionStatus(draft.uuid, 'PENDING');
      return 'network-error';
    }
    await updateDraftMissionStatus(draft.uuid, 'FAILED', {
      errorMessage: (error as any)?.response?.data?.message || 'Erreur de synchronisation',
    });
    return 'failed';
  }
}

// Upload découplé de la création du bien (CLAUDE.md §8) : un échec photo
// individuel ne doit jamais invalider ni bloquer la synchronisation du
// bien lui-même, ni celle de la mission qui le référence.
async function uploadDraftPhotos(missionUuid: string, idProperty: number) {
  const photos = await getPendingDraftPhotos(missionUuid);

  for (const photo of photos) {
    try {
      await updateDraftPhotoStatus(photo.id, 'UPLOADING');

      const formData = new FormData();
      formData.append('image', {
        uri: photo.localUri,
        name: `${photo.id}.jpg`,
        type: 'image/jpeg',
      } as unknown as Blob);

      await api.post(`/api/properties/${idProperty}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Suppression locale uniquement après confirmation serveur, jamais
      // avant (CLAUDE.md §8).
      deleteLocalPhoto(photo.localUri);
      await deleteDraftPhoto(photo.id);
    } catch {
      // Le fichier reste local avec un statut "échec", visible et
      // relançable manuellement — jamais de perte silencieuse.
      await updateDraftPhotoStatus(photo.id, 'FAILED');
    }
  }
}
