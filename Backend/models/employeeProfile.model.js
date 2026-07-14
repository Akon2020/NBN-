import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — profil RH. userId nullable via Person : un employé peut
// exister sans compte de connexion.
const EmployeeProfile = db.define(
  "employeeProfiles",
  {
    idEmployeeProfile: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idPerson: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idService: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idPoste: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    idResponsable: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    contractType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
  },
  { timestamps: true }
);

export default EmployeeProfile;
