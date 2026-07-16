import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4/§7 — message adressé à un utilisateur, historisable
// (in-app toujours créé ; push tenté séparément via OutboxEvent, jamais
// perdu même si l'envoi échoue). `relatedEntityType`/`relatedEntityId`
// sont une référence souple pour la navigation côté client (deep-link),
// PAS une association Sequelize avec intégrité référentielle : une
// Notification peut légitimement pointer vers n'importe quel type de
// ressource passée, et cette table est un journal, pas une relation
// métier à contraindre (contrairement aux tables de liaison Task,
// CLAUDE.md §4, qui restent des tables explicites par type).
const Notification = db.define(
  "notifications",
  {
    idNotification: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idUser: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    relatedEntityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    relatedEntityId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    pushStatus: {
      type: DataTypes.ENUM("PENDING", "SENT", "FAILED", "SKIPPED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
  },
  { timestamps: true, updatedAt: false }
);

export default Notification;
