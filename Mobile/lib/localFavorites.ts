import AsyncStorage from '@react-native-async-storage/async-storage';

// Favoris du "client final" sans compte (CLAUDE.md §4 — un Client n'est
// jamais un User dans ce système, pas de synchronisation serveur possible
// aujourd'hui). Stockage local uniquement, non sensible — classification
// "offline-readable" (CLAUDE.md §8, "favoris (lecture)").
const STORAGE_KEY = 'nbn_local_favorites';

export async function getLocalFavoriteIds(): Promise<Set<number>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

async function persist(ids: Set<number>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

export async function toggleLocalFavorite(idProperty: number): Promise<Set<number>> {
  const current = await getLocalFavoriteIds();
  if (current.has(idProperty)) {
    current.delete(idProperty);
  } else {
    current.add(idProperty);
  }
  await persist(current);
  return current;
}
