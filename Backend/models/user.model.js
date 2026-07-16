import { DataTypes } from "sequelize";
import db from "../database/db.js";

const User = db.define("users", {
  idUser: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  fullName: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    unique: true,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    // BACK-G02 : chaîne validée en application contre le catalogue `roles`
    // (table statique mais extensible), plus un ENUM figé au niveau DB.
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: "agent",
  },
  securityVersion: {
    // Incrémenté à chaque événement de révocation (suspension, changement
    // de mot de passe, déconnexion globale). Embarqué dans l'access token à
    // l'émission ; toute requête dont le jeton porte une version différente
    // est rejetée (CLAUDE.md §5).
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
    defaultValue: "ACTIVE",
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // BACK-G17 — jeton Expo Push enregistré par le Mobile (MOBILE-G05).
  // Nullable : un compte peut n'avoir jamais ouvert l'app mobile, ou avoir
  // refusé les notifications — dans ce cas la Notification reste
  // consultable en base (source de vérité), seule la tentative de push
  // est ignorée (PushProvider renvoie "SKIPPED").
  expoPushToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

export default User;
