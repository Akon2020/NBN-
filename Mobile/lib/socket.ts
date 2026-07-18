import { io, type Socket } from 'socket.io-client';

import { getAccessToken } from './secureStore';

// MOBILE-G05 — contrairement au Frontend web (cookie httpOnly), le Mobile
// stocke son jeton dans expo-secure-store, lisible en JS : passé
// directement via `auth.token`, lu côté serveur par
// shared/socketGateway.js (`extractToken`). Le Backend calcule seul les
// rooms — jamais un nom de room choisi ici (CLAUDE.md §6).
const API_URL = process.env.EXPO_PUBLIC_API_URL;

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      reconnection: true,
    });

    socket.on('connect_error', () => {
      // Silencieux — le fallback REST (focus refetch) reste la source de
      // vérité, jamais une erreur bloquante pour l'utilisateur.
    });

    getAccessToken().then((token) => {
      if (!token || !socket) return;
      socket.auth = { token };
      socket.connect();
    });
  }
  return socket;
};
