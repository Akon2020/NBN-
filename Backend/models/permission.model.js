import { DataTypes } from "sequelize";
import db from "../database/db.js";

const Permission = db.define(
  "permissions",
  {
    idPermission: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    key: {
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

export default Permission;
