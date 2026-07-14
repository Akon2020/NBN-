import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — entité centrale de l'organisation : identité humaine de
// base, distincte du compte de connexion (User, 0-1, nullable).
const Person = db.define(
  "persons",
  {
    idPerson: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    fullName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    idNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    idUser: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default Person;
