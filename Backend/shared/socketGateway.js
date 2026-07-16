import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { parseCookie } from "cookie";
import { JWT_SECRET } from "../config/env.js";
import { User } from "../models/index.model.js";
import { getSecurityVersion } from "../utils/securityVersionCache.js";
import { eventBus } from "./eventBus.js";

// CLAUDE.md §6 — le Backend reste le hub central : Frontend et Mobile ne
// communiquent jamais directement entre eux, tout passe par ici.
// L'audience (room) d'un client est calculée par le SERVEUR au moment de
// la connexion, à partir du même token/rôle que le REST — un nom de room
// fourni par le client n'est jamais une preuve d'autorisation, et le
// client ne peut d'ailleurs jamais en demander une lui-même (aucun
// événement "join" exposé côté client dans ce gateway).
let io = null;

const userRoom = (idUser) => `user:${idUser}`;
const roleRoom = (role) => `role:${role}`;

// Le Mobile (expo-secure-store) peut lire son propre jeton et le passer
// via `auth.token` ; le Frontend web le stocke dans un cookie httpOnly
// (ADMIN-G01, illisible en JS par conception) — la poignée de main
// Socket.IO transporte déjà ce cookie automatiquement (même origine,
// `withCredentials`), il suffit de le lire ici comme le fait
// `authMiddlware` pour le REST (double lecture, jamais une divergence de
// source de vérité entre les deux canaux).
const extractToken = (socket) => {
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }
  const rawCookie = socket.handshake.headers?.cookie;
  if (!rawCookie) return null;
  const parsed = parseCookie(rawCookie);
  return parsed.token || null;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = extractToken(socket);
    if (!token) {
      return next(new Error("Authentification requise."));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.email) {
      return next(new Error("Jeton invalide."));
    }

    const user = await User.findOne({
      where: { email: decoded.email },
      attributes: { exclude: ["password"] },
    });
    if (!user || user.status === "INACTIVE") {
      return next(new Error("Compte introuvable ou désactivé."));
    }

    const currentSecurityVersion = await getSecurityVersion(user.idUser);
    if (currentSecurityVersion === null || decoded.securityVersion !== currentSecurityVersion) {
      return next(new Error("Session invalidée."));
    }

    socket.data.user = user;
    next();
  } catch {
    next(new Error("Jeton invalide."));
  }
};

export const initSocketGateway = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const user = socket.data.user;
    // Audiences calculées ici, jamais choisies par le client (CLAUDE.md §6) :
    // une room personnelle (notifications ciblées) et une room de rôle
    // (diffusions de service, ex. nouvelle alerte pour la trésorerie).
    socket.join(userRoom(user.idUser));
    socket.join(roleRoom(user.role));
  });

  return io;
};

// CLAUDE.md §6 — distinction stricte Socket.IO ≠ push mobile : ceci ne
// touche que les clients actuellement connectés (déclencheur
// d'invalidation de cache côté Frontend/Mobile), jamais le canal fiable
// (Notification persistée + push, voir services/notification.service.js).
// Si `io` n'est pas initialisé (tests qui importent app.js sans passer par
// server.js, ou Socket.IO indisponible sur l'hébergement cible), ces
// fonctions sont des no-op silencieux — jamais une erreur qui romprait le
// flux métier appelant (CLAUDE.md §6, fallback obligatoire).
export const emitToUser = (idUser, event, payload) => {
  io?.to(userRoom(idUser)).emit(event, payload);
};

export const emitToRole = (role, event, payload) => {
  io?.to(roleRoom(role)).emit(event, payload);
};

// Câblage réutilisant les événements métier déjà émis pour
// Notification/Alert (BACK-G17) — un seul point d'écoute suffit pour que
// toute future Notification/Alert déclenche aussi un RealtimeEvent, sans
// dupliquer l'émission dans chaque contrôleur métier.
export const registerRealtimeListeners = () => {
  eventBus.on("notification:created", ({ notification }) => {
    emitToUser(notification.idUser, "notification:new", {
      idNotification: notification.idNotification,
      type: notification.type,
      title: notification.title,
    });
  });

  eventBus.on("alert:created", ({ alert }) => {
    // Pas de room de service dédiée par alerte en V1 (le ciblage précis par
    // service viendra si besoin) — diffusé à un rôle de pilotage large.
    emitToRole("operations", "alert:new", { idAlert: alert.idAlert, type: alert.type });
  });

  eventBus.on("alert:transitioned", ({ alert }) => {
    emitToRole("operations", "alert:updated", { idAlert: alert.idAlert, statut: alert.statut });
  });
};
