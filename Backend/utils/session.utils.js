import crypto from "crypto";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import {
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_WEB_DAYS,
  REFRESH_TOKEN_EXPIRES_MOBILE_DAYS,
} from "../config/env.js";
import { Session } from "../models/index.model.js";

const REFRESH_TOKEN_BYTES = 64;

export const generateAccessToken = (user) => {
  return jwt.sign(
    { email: user.email, securityVersion: user.securityVersion },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN || "15m" }
  );
};

const generateOpaqueToken = () =>
  crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// CLAUDE.md §5 — pas d'empreinte intrusive, juste un libellé lisible dérivé
// du User-Agent.
export const deriveDeviceLabel = (userAgent) => {
  if (!userAgent) return "Appareil inconnu";
  return userAgent.slice(0, 150);
};

const refreshExpiryDays = (platform) =>
  platform === "web"
    ? Number(REFRESH_TOKEN_EXPIRES_WEB_DAYS || 7)
    : Number(REFRESH_TOKEN_EXPIRES_MOBILE_DAYS || 30);

/**
 * Crée une nouvelle famille de sessions (première émission après login).
 */
export const createSession = async ({ idUser, platform, userAgent }) => {
  const refreshToken = generateOpaqueToken();
  const tokenFamilyId = randomUUID();
  const expiresAt = new Date(
    Date.now() + refreshExpiryDays(platform) * 24 * 60 * 60 * 1000
  );

  const session = await Session.create({
    idUser,
    refreshTokenHash: hashToken(refreshToken),
    tokenFamilyId,
    platform,
    deviceLabel: deriveDeviceLabel(userAgent),
    expiresAt,
  });

  return { refreshToken, session };
};

/**
 * Rotation (CLAUDE.md §5) : l'ancienne session est révoquée et pointe vers
 * la nouvelle (`replacedBySessionId`), qui reste dans la même famille de
 * tokens (`tokenFamilyId`) — nécessaire pour la détection de réutilisation.
 */
export const rotateSession = async (previousSession, { userAgent } = {}) => {
  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(
    Date.now() +
      refreshExpiryDays(previousSession.platform) * 24 * 60 * 60 * 1000
  );

  const newSession = await Session.create({
    idUser: previousSession.idUser,
    refreshTokenHash: hashToken(refreshToken),
    tokenFamilyId: previousSession.tokenFamilyId,
    platform: previousSession.platform,
    deviceLabel: deriveDeviceLabel(userAgent) || previousSession.deviceLabel,
    expiresAt,
  });

  previousSession.revokedAt = new Date();
  previousSession.revokedReason = "logout";
  previousSession.replacedBySessionId = newSession.idSession;
  await previousSession.save();

  return { refreshToken, session: newSession };
};

export const revokeSession = async (session, reason) => {
  session.revokedAt = new Date();
  session.revokedReason = reason;
  await session.save();
};

/**
 * Détection de réutilisation : révoque toute la famille de tokens dès
 * qu'un refresh token déjà révoqué est présenté à nouveau.
 */
export const revokeTokenFamily = async (tokenFamilyId, reason) => {
  await Session.update(
    { revokedAt: new Date(), revokedReason: reason },
    { where: { tokenFamilyId, revokedAt: null } }
  );
};

export const revokeAllUserSessions = async (idUser, reason) => {
  await Session.update(
    { revokedAt: new Date(), revokedReason: reason },
    { where: { idUser, revokedAt: null } }
  );
};
