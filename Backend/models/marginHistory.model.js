import { DataTypes } from "sequelize";
import db from "../database/db.js";

// GOAL 9 — historique append-only des changements de marge, distinct de la
// Timeline générique (shared/timeline.js) : un changement de pourcentage
// global par type de bien n'est pas rattaché à un bien précis, donc pas un
// bon candidat pour un événement PROPERTY. Un changement d'override sur un
// bien précis, lui, est aussi journalisé sur la timeline de ce bien
// (visibilité locale) en plus d'une ligne ici (visibilité globale/audit).
const MarginHistory = db.define(
  "marginHistories",
  {
    idMarginHistory: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    scope: {
      type: DataTypes.ENUM("GLOBAL", "PROPERTY"),
      allowNull: false,
    },
    propertyType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    idProperty: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    previousPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    // null = override retiré (retour au pourcentage global par défaut).
    newPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    actorUserId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  { timestamps: true, updatedAt: false }
);

export default MarginHistory;
