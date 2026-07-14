import * as SecureStore from 'expo-secure-store';

// MOBILE-G02 — le refresh token ne doit jamais être lisible en clair par
// une inspection du stockage de l'appareil : expo-secure-store utilise le
// Keychain (iOS) / Keystore (Android), jamais AsyncStorage (CLAUDE.md §12).
const ACCESS_TOKEN_KEY = 'nbn_access_token';
const REFRESH_TOKEN_KEY = 'nbn_refresh_token';

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
