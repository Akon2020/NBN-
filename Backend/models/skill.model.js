import { DataTypes } from "sequelize";
import db from "../database/db.js";

// BACK-G22 — catalogue de compétences (référentiel partagé, pas dupliqué
// par employé). Le niveau par employé vit sur la table de liaison
// EmployeeSkill.
const Skill = db.define(
  "skills",
  {
    idSkill: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default Skill;
