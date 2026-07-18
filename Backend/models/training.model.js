import { DataTypes } from "sequelize";
import db from "../database/db.js";

// BACK-G22 — catalogue de formations (référentiel partagé), le suivi par
// employé vit sur la table de liaison EmployeeTraining.
const Training = db.define(
  "trainings",
  {
    idTraining: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default Training;
