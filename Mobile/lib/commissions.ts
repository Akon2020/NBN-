import { api } from './api';

export type CommissionStatut = 'CALCULEE' | 'DUE' | 'PAYEE' | 'ANNULEE';
export type CommissionBeneficiaireType = 'AGENCE' | 'AGENT' | 'COMMISSIONNAIRE';

export const COMMISSION_STATUT_LABELS: Record<CommissionStatut, string> = {
  CALCULEE: 'Calculée',
  DUE: 'Due',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
};

export interface Commission {
  idCommission: number;
  idClient: number;
  idProperty?: number | null;
  beneficiaireType: CommissionBeneficiaireType;
  montantTransaction: number;
  montantCommission: number;
  currencyCode: string;
  statut: CommissionStatut;
  createdAt: string;
}

// GET /api/commissions (commissions:read).
export async function getAllCommissions(statut?: CommissionStatut): Promise<Commission[]> {
  const res = await api.get('/api/commissions', { params: { statut } });
  return res.data.data;
}
