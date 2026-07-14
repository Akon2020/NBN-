import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CDC §7 — système d'incidents (retard > 30 min, données incomplètes,
// non-respect des règles) impactant le score discipline et potentiellement
// le statut du commissionnaire (voir utils/commissionnaireScoring.js).
const CommissionnaireIncident = db.define(
  "commissionnaireIncidents",
  {
    idIncident: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idCommissionnaire: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("RETARD", "DONNEES_INCOMPLETES", "NON_RESPECT_REGLES", "AUTRE"),
      allowNull: false,
    },
    gravite: {
      type: DataTypes.ENUM("MINEUR", "MODERE", "MAJEUR"),
      allowNull: false,
      defaultValue: "MINEUR",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    impactDiscipline: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    dateIncident: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default CommissionnaireIncident;
