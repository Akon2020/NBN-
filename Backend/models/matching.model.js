import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CDC §3 module 4 "MATCHING" — associer 1 client à plusieurs biens.
const Matching = db.define(
  "matchings",
  {
    idMatching: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idClient: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idProperty: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM("EN_COURS", "PROPOSE", "VALIDE"),
      allowNull: false,
      defaultValue: "EN_COURS",
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default Matching;
