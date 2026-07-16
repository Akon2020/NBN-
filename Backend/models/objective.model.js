import { DataTypes } from "sequelize";
import db from "../database/db.js";

// BACK-G22 — objectif individuel assigné à un EmployeeProfile. V1
// minimale : un statut simple, pas de sous-objectifs ni de pondération.
const Objective = db.define(
  "objectives",
  {
    idObjective: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idEmployeeProfile: {
      type: DataTypes.BIGINT,
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
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM("EN_COURS", "ATTEINT", "NON_ATTEINT"),
      allowNull: false,
      defaultValue: "EN_COURS",
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  { timestamps: true }
);

export default Objective;
