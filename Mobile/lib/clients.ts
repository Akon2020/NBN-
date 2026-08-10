import { api } from './api';

export type ClientType = 'LOCATAIRE' | 'ACHETEUR';

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  LOCATAIRE: 'Locataire',
  ACHETEUR: 'Acheteur',
};

export interface Client {
  idClient: number;
  dossierNumber?: string | null;
  idPerson: number;
  type: ClientType;
  statutPipeline?: string | null;
  person?: { fullName: string; phone?: string | null; email?: string | null };
  createdAt: string;
}

// GET /api/clients (clients:read) — même endpoint que le Frontend Admin.
export async function getAllClients(): Promise<Client[]> {
  const res = await api.get('/api/clients');
  return res.data.data;
}
