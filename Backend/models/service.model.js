import { DataTypes } from "sequelize";
import db from "../database/db.js";

const Service = db.define(
  "services",
  {
    idService: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default Service;
