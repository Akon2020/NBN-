import { DataTypes } from "sequelize";
import db from "../database/db.js";

const Poste = db.define(
  "postes",
  {
    idPoste: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    idService: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  { timestamps: true }
);

export default Poste;
