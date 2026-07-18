import { io, type Socket } from "socket.io-client";

// ADMIN-G07 — le jeton vit dans un cookie httpOnly (lib/axios.ts) : la
// poignée de main Socket.IO l'envoie automatiquement via
// `withCredentials`, exactement comme une requête axios classique. Le
// Backend calcule lui-même les rooms (audiences) à la connexion —
// jamais un nom de room choisi ici (CLAUDE.md §6).
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
};
