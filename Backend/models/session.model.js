import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §5 — Session (pas une simple table RefreshToken) : porte la
// rotation des refresh tokens, la détection de réutilisation (via
// tokenFamilyId) et l'historique de révocation.
const Session = db.define(
  "sessions",
  {
    idSession: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idUser: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    refreshTokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    tokenFamilyId: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    replacedBySessionId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    platform: {
      type: DataTypes.ENUM("web", "ios", "android"),
      allowNull: false,
      defaultValue: "web",
    },
    deviceLabel: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revokedReason: {
      type: DataTypes.ENUM(
        "logout",
        "logout_all",
        "admin_revoke",
        "reuse_detected",
        "account_suspended",
        "password_changed",
        "expired"
      ),
      allowNull: true,
    },
  },
  { timestamps: true, updatedAt: false }
);

export default Session;
