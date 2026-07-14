import { User } from "../models/index.model.js";

// CLAUDE.md §5 — cache in-process de révocation, sans dépendance Redis
// (contrainte cPanel mono-process tant que non infirmée). Abstraction
// remplaçable : à basculer vers un cache partagé si l'hébergement final
// fait tourner plusieurs process Node en parallèle (cluster).
const CACHE_TTL_MS = 60 * 1000;

const cache = new Map(); // idUser -> { version, cachedAt }

export const getSecurityVersion = async (idUser) => {
  const cached = cache.get(idUser);
  const now = Date.now();

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.version;
  }

  const user = await User.findByPk(idUser, {
    attributes: ["securityVersion"],
  });

  if (!user) {
    cache.delete(idUser);
    return null;
  }

  cache.set(idUser, { version: user.securityVersion, cachedAt: now });
  return user.securityVersion;
};

export const invalidateSecurityVersion = (idUser) => {
  cache.delete(idUser);
};

export const clearSecurityVersionCache = () => {
  cache.clear();
};
