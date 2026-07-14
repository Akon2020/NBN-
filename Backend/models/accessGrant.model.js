import { DataTypes } from "sequelize";
import db from "../database/db.js";

// Mécanisme d'exception RBAC pour le rôle "consultant" (zéro permission de
// base) — jamais un override générique appliqué à tous les rôles
// (CLAUDE.md §5).
const AccessGrant = db.define(
  "accessGrants",
  {
    idAccessGrant: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idUser: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    permissionKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    grantedBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    grantedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revokedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default AccessGrant;
