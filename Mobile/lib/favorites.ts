import { api } from './api';

export interface Favorite {
  idFavorite: number;
  idUser: number;
  idProperty: number;
  createdAt: string;
}

// Favoris serveur — réservés au profil "interne" (compte réel). Le "client
// final" sans compte utilise `lib/localFavorites.ts` (AsyncStorage).
export async function getMyFavorites(): Promise<Favorite[]> {
  const res = await api.get('/api/favorites');
  return res.data.data;
}

export async function addFavorite(idProperty: number): Promise<Favorite> {
  const res = await api.post('/api/favorites', { idProperty });
  return res.data.data;
}

export async function removeFavorite(idProperty: number): Promise<void> {
  await api.delete(`/api/favorites/${idProperty}`);
}
