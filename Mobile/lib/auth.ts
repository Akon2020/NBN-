import { Platform } from 'react-native';

import { api } from './api';
import { clearTokens, getRefreshToken, saveTokens } from './secureStore';
import { registerPushToken } from './notifications';

export type AuthUser = {
  idUser: number;
  fullName: string;
  email: string;
  role: string;
  status: string;
};

const resolvePlatform = () => (Platform.OS === 'ios' ? 'ios' : 'android');

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api.post('/api/auth/login', {
    email,
    password,
    platform: resolvePlatform(),
  });

  const { token, refreshToken, userInfo } = res.data.data;
  await saveTokens(token, refreshToken);

  // Ne bloque jamais la connexion — l'enregistrement du token push est un
  // effet secondaire best-effort (lib/notifications.ts avale déjà ses
  // propres erreurs, mais on isole quand même l'appel ici par prudence).
  registerPushToken().catch(() => {});

  return userInfo;
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    await api.post('/api/auth/logout', { refreshToken });
  } catch {
    // Le nettoyage local a lieu même si l'appel réseau échoue.
  } finally {
    await clearTokens();
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await api.get('/api/auth/profile');
    return res.data.user;
  } catch {
    return null;
  }
}

// MOBILE-G01/G02 — le profil "client final" n'a pas encore de compte
// utilisateur back-end (CRM à venir en M2) ; seuls les profils internes
// (staff) passent par ce login réel.
export const roleToHomeRoute = (role: string): string =>
  role === 'commissionnaire' ? '/(commissionnaire)/missions' : '/(interne)/dashboard';
