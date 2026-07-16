import { DataTypes } from "sequelize";
import db from "../database/db.js";

// BACK-G22 — table de liaison explicite EmployeeProfile↔Skill (CLAUDE.md
// §4 : jamais de relation polymorphe générique).
const EmployeeSkill = db.define(
  "employeeSkills",
  {
    idEmployeeSkill: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idEmployeeProfile: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idSkill: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    niveau: {
      type: DataTypes.ENUM("DEBUTANT", "INTERMEDIAIRE", "AVANCE", "EXPERT"),
      allowNull: false,
      defaultValue: "DEBUTANT",
    },
  },
  {
    timestamps: true,
    indexes: [{ unique: true, fields: ["idEmployeeProfile", "idSkill"] }],
  }
);

export default EmployeeSkill;
