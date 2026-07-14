import axios from 'axios';

import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './secureStore';

// En dev, `localhost` ne pointe pas vers la machine hôte depuis un appareil
// physique/émulateur — utiliser l'IP LAN de la machine de dev ou un tunnel
// Expo. EXPO_PUBLIC_API_URL est lu depuis .env (préfixe requis par Expo
// pour exposer une variable au bundle client).
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5500';

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
