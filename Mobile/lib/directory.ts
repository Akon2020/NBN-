import { api } from './api';

// Annuaire minimal (id/nom/rôle), ouvert à tout utilisateur authentifié
// côté Backend (GET /api/users/directory, GOAL 11) — utilisé ici pour les
// sélecteurs d'assignation de tâches.
export interface UserDirectoryEntry {
  idUser: number;
  fullName: string;
  role: string;
}

export async function getUsersDirectory(): Promise<UserDirectoryEntry[]> {
  const res = await api.get('/api/users/directory');
  return res.data.data;
}
