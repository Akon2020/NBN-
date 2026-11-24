import { DataTypes } from "sequelize";
import db from "../database/db.js";

// Jeton à usage unique (réinitialisation, clé d'accès, premier mot de
// passe). Seul le hachage SHA-256 est conservé, jamais le jeton en clair.
const AuthToken = db.define("authTokens", {
  idAuthToken: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  idUser: { type: DataTypes.BIGINT, allowNull: false },
  purpose: {
    type: DataTypes.ENUM("PASSWORD_RESET", "ACCESS_KEY", "PASSWORD_SETUP"),
    allowNull: false,
  },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  usedAt: { type: DataTypes.DATE, allowNull: true },
  revokedAt: { type: DataTypes.DATE, allowNull: true },
  createdBy: { type: DataTypes.BIGINT, allowNull: true },
});

export default AuthToken;
