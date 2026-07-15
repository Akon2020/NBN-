import { syncPendingMissions } from '@/lib/sync/syncEngine';
import { api } from '@/lib/api';
import {
  getPendingDraftMissions,
  getPendingDraftPhotos,
  updateDraftMissionStatus,
} from '@/lib/repository/missionRepository';
import type { DraftMission } from '@/lib/missions';

// MOBILE-G04 — scénario explicitement requis par plan.md : une coupure
// réseau EN COURS de synchronisation ne doit jamais dupliquer une
// ressource déjà créée côté serveur lors de la reprise. Module pur (pas
// de rendu de composant React Native), cohérent avec la limite déjà
// documentée dans walkthrough.md (Jest + NativeWind).
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('@/lib/repository/missionRepository', () => ({
  getPendingDraftMissions: jest.fn(),
  updateDraftMissionStatus: jest.fn(),
  getPendingDraftPhotos: jest.fn(),
  updateDraftPhotoStatus: jest.fn(),
  deleteDraftPhoto: jest.fn(),
}));

jest.mock('@/lib/media/photoCompression', () => ({
  deleteLocalPhoto: jest.fn(),
}));

const baseDraft: DraftMission = {
  uuid: 'draft-uuid-1',
  type: 'COLLECTE_BIEN',
  payload: { category: 'RENT', propertyType: 'APPARTEMENT', price: 350, quartier: 'Ibanda' },
  status: 'PENDING',
  createdAt: '2026-07-14T10:00:00.000Z',
  syncedAt: null,
  serverIdProperty: null,
  serverIdClient: null,
  serverIdMission: null,
  errorMessage: null,
};

describe('syncEngine — coupure réseau en cours de synchronisation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPendingDraftPhotos as jest.Mock).mockResolvedValue([]);
  });

  it('ne recrée jamais le bien déjà créé côté serveur lors de la reprise après coupure', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { idCommissionnaire: 42 } });
    (api.post as jest.Mock)
      .mockResolvedValueOnce({ data: { data: { idProperty: 7 } } }) // POST /properties réussit
      .mockRejectedValueOnce({ response: undefined }); // POST /missions : coupure réseau, pas de réponse

    (getPendingDraftMissions as jest.Mock).mockResolvedValue([baseDraft]);

    const firstPass = await syncPendingMissions();

    expect(firstPass.stoppedOnNetworkError).toBe(true);
    expect(firstPass.synced).toBe(0);
    // Le serverIdProperty est persisté immédiatement après la création du
    // bien, avant même de tenter la création de la mission.
    expect(updateDraftMissionStatus).toHaveBeenCalledWith('draft-uuid-1', 'SYNCING', {
      serverIdProperty: 7,
    });
    expect(updateDraftMissionStatus).toHaveBeenLastCalledWith('draft-uuid-1', 'PENDING');

    // Deuxième passage : reprise après coupure. Le draft porte maintenant
    // serverIdProperty=7 (persisté au premier passage).
    jest.clearAllMocks();
    (getPendingDraftPhotos as jest.Mock).mockResolvedValue([]);
    (api.get as jest.Mock).mockResolvedValue({ data: { idCommissionnaire: 42 } });
    (api.post as jest.Mock).mockResolvedValueOnce({ data: { data: { idMission: 99 } } });

    const resumedDraft: DraftMission = { ...baseDraft, serverIdProperty: 7 };
    (getPendingDraftMissions as jest.Mock).mockResolvedValue([resumedDraft]);

    const secondPass = await syncPendingMissions();

    // Un seul appel POST au second passage : /api/missions. Le bien
    // n'est JAMAIS recréé (pas de second POST /api/properties).
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(
      '/api/missions',
      expect.objectContaining({ uuid: 'draft-uuid-1', idProperty: 7 })
    );
    expect(secondPass.synced).toBe(1);
    expect(updateDraftMissionStatus).toHaveBeenCalledWith('draft-uuid-1', 'SYNCED', {
      serverIdMission: 99,
    });
  });

  it("s'arrête au premier draft en échec réseau sans traiter les suivants (FIFO)", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { idCommissionnaire: 42 } });
    (api.post as jest.Mock).mockRejectedValue({ response: undefined });

    const secondDraft: DraftMission = { ...baseDraft, uuid: 'draft-uuid-2', type: 'SUIVI', payload: { notes: 'x' } };
    (getPendingDraftMissions as jest.Mock).mockResolvedValue([baseDraft, secondDraft]);

    const summary = await syncPendingMissions();

    expect(summary.stoppedOnNetworkError).toBe(true);
    // Seul le premier draft a été tenté — le second n'a jamais été touché,
    // l'ordre FIFO reste respecté au prochain passage.
    expect(updateDraftMissionStatus).not.toHaveBeenCalledWith('draft-uuid-2', expect.anything());
  });

  it('marque un draft en échec (FAILED) sur une erreur de validation, sans bloquer le suivant', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { idCommissionnaire: 42 } });
    (api.post as jest.Mock)
      .mockRejectedValueOnce({ response: { status: 400, data: { message: 'Données invalides' } } })
      .mockResolvedValueOnce({ data: { data: { idMission: 100 } } });

    const secondDraft: DraftMission = { ...baseDraft, uuid: 'draft-uuid-2', type: 'SUIVI', payload: { notes: 'x' } };
    (getPendingDraftMissions as jest.Mock).mockResolvedValue([baseDraft, secondDraft]);

    const summary = await syncPendingMissions();

    expect(summary.failed).toBe(1);
    expect(summary.synced).toBe(1);
    expect(updateDraftMissionStatus).toHaveBeenCalledWith('draft-uuid-1', 'FAILED', {
      errorMessage: 'Données invalides',
    });
  });
});
