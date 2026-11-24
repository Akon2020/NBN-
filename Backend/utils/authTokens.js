import crypto from "crypto";
import { Op } from "sequelize";
import db from "../database/db.js";
import { AuthToken } from "../models/index.model.js";
import { hashToken } from "./session.utils.js";

// Durées de validité, en minutes (CLAUDE.md §13 : jamais en dur).
// - Réinitialisation demandée depuis « Mot de passe oublié » : 15 min
//   maximum, exigence de l'agence.
// - Premier mot de passe après une connexion avec le mot de passe par
//   défaut : 15 min, l'utilisateur est devant son écran.
// - Clé d'accès d'un commissionnaire : envoyée par l'agence, ouverte
//   parfois le lendemain sur le terrain, 72 h par défaut.
const ttlMinutes = (purpose) => {
  const values = {
    PASSWORD_RESET: Number(process.env.PASSWORD_RESET_TTL_MINUTES || 15),
    PASSWORD_SETUP: Number(process.env.PASSWORD_SETUP_TTL_MINUTES || 15),
    ACCESS_KEY: Number(process.env.ACCESS_KEY_TTL_HOURS || 72) * 60,
  };
  return values[purpose];
};

// Clé d'accès lisible et facile à dicter (pas de 0/O, 1/I/L) ; les autres
// usages passent par un lien, un jeton long suffit.
const READABLE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const readableKey = (length = 10) => {
  const bytes = crypto.randomBytes(length);
  let key = "";
  for (let i = 0; i < length; i += 1) key += READABLE_ALPHABET[bytes[i] % READABLE_ALPHABET.length];
  return `${key.slice(0, 5)}-${key.slice(5)}`;
};

// Une clé saisie à la main peut contenir minuscules, espaces ou tirets
// déplacés : elle est ramenée à sa forme canonique avant hachage.
export const normalizeAccessKey = (raw) => {
  const compact = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact.length === 10 ? `${compact.slice(0, 5)}-${compact.slice(5)}` : String(raw ?? "").trim();
};

/**
 * Émet un jeton à usage unique et révoque ceux du même usage encore
 * valides pour ce compte (un seul lien actif à la fois).
 */
export const issueAuthToken = async ({ idUser, purpose, createdBy = null }) => {
  const raw = purpose === "ACCESS_KEY" ? readableKey() : crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ttlMinutes(purpose) * 60 * 1000);

  await db.transaction(async (transaction) => {
    await AuthToken.update(
      { revokedAt: new Date() },
      { where: { idUser, purpose, usedAt: null, revokedAt: null }, transaction },
    );
    await AuthToken.create(
      { idUser, purpose, tokenHash: hashToken(raw), expiresAt, createdBy },
      { transaction },
    );
  });

  return { token: raw, expiresAt };
};

/**
 * Consomme un jeton : vérifie l'usage, l'expiration, qu'il n'a été ni
 * utilisé ni révoqué, et le marque utilisé dans la même transaction que
 * l'action protégée (`action(token, transaction)`). Un second appel avec le
 * même jeton échoue toujours.
 */
export const consumeAuthToken = async (raw, purposes, action) => {
  const allowed = Array.isArray(purposes) ? purposes : [purposes];
  const candidates = [String(raw ?? "").trim(), normalizeAccessKey(raw)].filter(Boolean);
  if (candidates.length === 0) return { ok: false, reason: "invalid" };

  return db.transaction(async (transaction) => {
    const token = await AuthToken.findOne({
      where: {
        tokenHash: { [Op.in]: candidates.map(hashToken) },
        purpose: { [Op.in]: allowed },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!token) return { ok: false, reason: "invalid" };
    if (token.usedAt) return { ok: false, reason: "used" };
    if (token.revokedAt) return { ok: false, reason: "revoked" };
    if (token.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

    token.usedAt = new Date();
    await token.save({ transaction });
    const result = action ? await action(token, transaction) : undefined;
    return { ok: true, token, result };
  });
};

export const TOKEN_REFUSAL_MESSAGES = {
  invalid: "Ce lien ou cette clé n'est pas valide.",
  used: "Ce lien ou cette clé a déjà été utilisé. Demandez-en un nouveau.",
  revoked: "Ce lien ou cette clé a été remplacé par un envoi plus récent.",
  expired: "Ce lien ou cette clé a expiré. Demandez-en un nouveau.",
};
