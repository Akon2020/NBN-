import { DataTypes } from "sequelize";
import db from "../database/db.js";

// GOAL 8 — plaintes client, absentes du système jusqu'ici (seul
// CommissionnaireIncident existait, côté terrain). Table dédiée plutôt
// qu'un texte libre dans `notesAgent` : un statut de suivi réel (ouverte/
// résolue) a une valeur métier propre, pas seulement une note.
const ClientComplaint = db.define(
  "clientComplaints",
  {
    idClientComplaint: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idClient: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM("OUVERTE", "RESOLUE"),
      allowNull: false,
      defaultValue: "OUVERTE",
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
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

export default ClientComplaint;
