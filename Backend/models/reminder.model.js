import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — programmé à partir d'une échéance/règle. Un job cron
// (services/reminder.worker.js, GOAL 11) parcourt les Reminder PLANIFIE
// dont `dueAt` est passée et produit une Notification au moment voulu,
// sans dépendance à ce que l'utilisateur ait l'app ouverte.
const Reminder = db.define(
  "reminders",
  {
    idReminder: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idUser: {
      type: DataTypes.BIGINT,
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
    dueAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM("PLANIFIE", "ENVOYE", "ANNULE"),
      allowNull: false,
      defaultValue: "PLANIFIE",
    },
    relatedEntityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    relatedEntityId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default Reminder;
