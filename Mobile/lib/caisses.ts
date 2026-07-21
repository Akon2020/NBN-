import { api } from './api';

export type CaisseStatut = 'OUVERTE' | 'CLOTUREE';

export const CAISSE_STATUT_LABELS: Record<CaisseStatut, string> = {
  OUVERTE: 'Ouverte',
  CLOTUREE: 'Clôturée',
};

export interface CaisseBalance {
  currencyCode: string;
  balance: number;
}

export interface Caisse {
  idCaisse: number;
  label: string;
  statut: CaisseStatut;
  responsable?: { idUser: number; fullName: string } | null;
  balances?: CaisseBalance[];
}

// GET /api/caisses (treasury:read).
export async function getAllCaisses(): Promise<Caisse[]> {
  const res = await api.get('/api/caisses');
  return res.data.data;
}
