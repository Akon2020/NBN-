import { DataTypes } from "sequelize";
import db from "../database/db.js";

// BACK-G22 — table de liaison explicite EmployeeProfile↔Training
// (CLAUDE.md §4 : jamais de relation polymorphe générique).
const EmployeeTraining = db.define(
  "employeeTrainings",
  {
    idEmployeeTraining: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idEmployeeProfile: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idTraining: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM("PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"),
      allowNull: false,
      defaultValue: "PLANIFIEE",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default EmployeeTraining;
