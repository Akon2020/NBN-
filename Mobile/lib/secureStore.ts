import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// MOBILE-G02 — le refresh token ne doit jamais être lisible en clair par
// une inspection du stockage de l'appareil : expo-secure-store utilise le
// Keychain (iOS) / Keystore (Android), jamais AsyncStorage (CLAUDE.md §12).
//
// expo-secure-store n'a pas d'implémentation web (l'app cible iOS/Android,
// le web ne sert qu'à la prévisualisation en développement) — un simple
// repli en mémoire évite un crash au chargement sans jamais être utilisé
// en conditions réelles.
const ACCESS_TOKEN_KEY = 'nbn_access_token';
const REFRESH_TOKEN_KEY = 'nbn_refresh_token';

const memoryFallback = new Map<string, string>();
const isWeb = Platform.OS === 'web';

const setItem = (key: string, value: string) =>
  isWeb ? Promise.resolve(memoryFallback.set(key, value)).then(() => undefined) : SecureStore.setItemAsync(key, value);

const getItem = (key: string) =>
  isWeb ? Promise.resolve(memoryFallback.get(key) ?? null) : SecureStore.getItemAsync(key);

const deleteItem = (key: string) =>
  isWeb ? Promise.resolve(memoryFallback.delete(key)).then(() => undefined) : SecureStore.deleteItemAsync(key);

export async function saveTokens(accessToken: string, refreshToken: string) {
  await setItem(ACCESS_TOKEN_KEY, accessToken);
  await setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessToken() {
  return getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function clearTokens() {
  await deleteItem(ACCESS_TOKEN_KEY);
  await deleteItem(REFRESH_TOKEN_KEY);
}
