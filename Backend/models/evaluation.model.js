import { DataTypes } from "sequelize";
import db from "../database/db.js";

// BACK-G22 — évaluation de performance ponctuelle rattachée à un
// EmployeeProfile (jamais à un User directement : un employé peut ne pas
// avoir de compte de connexion, CLAUDE.md §4). V1 minimale : une note
// libre /100 et un commentaire, pas de grille de critères pondérés.
const Evaluation = db.define(
  "evaluations",
  {
    idEvaluation: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idEmployeeProfile: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    evaluatorUserId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    period: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    evaluatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  { timestamps: true }
);

export default Evaluation;
