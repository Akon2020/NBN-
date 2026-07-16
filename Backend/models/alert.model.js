import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — cycle de vie propre : ouverte → reconnue → assignée →
// en cours → résolue → clôturée. Liste des types encore ouverte
// (CLAUDE.md §16 point 2) : "commissionnaire:score_bas" et
// "requisition:en_attente" sont les deux premiers types réels câblés ;
// d'autres s'ajouteront au fil du développement sans changement de
// schéma (`type` reste une chaîne libre, pas un ENUM figé).
const Alert = db.define(
  "alerts",
  {
    idAlert: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    severite: {
      type: DataTypes.ENUM("INFO", "AVERTISSEMENT", "CRITIQUE"),
      allowNull: false,
      defaultValue: "AVERTISSEMENT",
    },
    statut: {
      type: DataTypes.ENUM("OUVERTE", "RECONNUE", "ASSIGNEE", "EN_COURS", "RESOLUE", "CLOTUREE"),
      allowNull: false,
      defaultValue: "OUVERTE",
    },
    assignedTo: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    // Référence souple, même principe que Notification ci-dessus — pas
    // une association contrainte.
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
    resolvedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default Alert;
