import Constants from 'expo-constants';
import axios from 'axios';

import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './secureStore';

const BACKEND_PORT = 5500;

// En dev, `localhost` ne pointe pas vers la machine hôte depuis un appareil
// physique/émulateur — c'est l'appareil lui-même. `Constants.expoConfig.hostUri`
// contient déjà l'adresse LAN que Metro utilise pour servir le bundle à
// l'appareil (ex. "192.168.1.42:8081") ; on réutilise le même hôte pour
// joindre le Backend, en changeant seulement le port. EXPO_PUBLIC_API_URL
// (si défini via .env) garde toujours la priorité pour un override explicite.
const resolveDevApiUrl = (): string => {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:${BACKEND_PORT}` : `http://localhost:${BACKEND_PORT}`;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || resolveDevApiUrl();

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

const attemptRefresh = async (): Promise<string | null> => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
    const { token, refreshToken: newRefreshToken } = res.data.data;
    await saveTokens(token, newRefreshToken);
    return token;
  } catch {
    await clearTokens();
    return null;
  }
};

// Rotation transparente (BACK-G01) : un 401 déclenche une unique tentative
// de refresh avant de rejouer la requête d'origine.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      if (!refreshInFlight) {
        refreshInFlight = attemptRefresh().finally(() => {
          refreshInFlight = null;
        });
      }

      const newToken = await refreshInFlight;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
