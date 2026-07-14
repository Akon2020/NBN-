import { Op } from "sequelize";
import { Role, AccessGrant } from "../models/index.model.js";

// BACK-G02 — RBAC hybride (Role + Permission), complété par le mécanisme
// d'exception AccessGrant pour le rôle consultant (CLAUDE.md §5).
// "admin" a un accès total par construction (statut distingué, pas une
// simple entrée RolePermission qu'il faudrait maintenir à jour à chaque
// nouvelle permission).
export const getEffectivePermissions = async (user) => {
  if (!user) return new Set();
  if (user.role === "admin") return "ALL";

  const permissions = new Set();

  const role = await Role.findOne({
    where: { name: user.role },
    include: [{ association: "permissions", attributes: ["key"] }],
  });

  if (role) {
    for (const permission of role.permissions) {
      permissions.add(permission.key);
    }
  }

  const activeGrants = await AccessGrant.findAll({
    where: {
      idUser: user.idUser,
      revokedAt: null,
      [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
    },
  });

  for (const grant of activeGrants) {
    permissions.add(grant.permissionKey);
  }

  return permissions;
};

export const hasPermission = async (user, permissionKey) => {
  const permissions = await getEffectivePermissions(user);
  if (permissions === "ALL") return true;
  return permissions.has(permissionKey);
};

/**
 * Garde de permission générique (BACK-G02) — remplace le correctif
 * temporaire `requireRole` de SEC-G02. Doit être appelée après
 * `authMiddlware`.
 */
export const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    try {
      const allowed = await hasPermission(req.user, permissionKey);
      if (!allowed) {
        return res
          .status(403)
          .json({ message: "Accès refusé : permissions insuffisantes." });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
