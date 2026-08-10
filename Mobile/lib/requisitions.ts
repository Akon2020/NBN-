import { api } from './api';

export type RequisitionStatut = 'SOUMISE' | 'COMPLEMENT_DEMANDE' | 'APPROUVEE' | 'REJETEE';

export const REQUISITION_STATUT_LABELS: Record<RequisitionStatut, string> = {
  SOUMISE: 'Soumise',
  COMPLEMENT_DEMANDE: 'Complément demandé',
  APPROUVEE: 'Approuvée',
  REJETEE: 'Rejetée',
};

export interface Requisition {
  idRequisition: number;
  nature: string;
  quantite?: number | null;
  coutEstime: number;
  currencyCode: string;
  statut: RequisitionStatut;
  motifDecision?: string | null;
  demandeur?: { idUser: number; fullName: string };
  caisse?: { idCaisse: number; label: string };
  createdAt: string;
}

// GET /api/requisitions (requisitions:read) — filtre non-archivées par défaut côté Backend.
export async function getAllRequisitions(statut?: RequisitionStatut): Promise<Requisition[]> {
  const res = await api.get('/api/requisitions', { params: { statut } });
  return res.data.data;
}
