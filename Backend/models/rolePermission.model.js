import { DataTypes } from "sequelize";
import db from "../database/db.js";

const RolePermission = db.define(
  "rolePermissions",
  {
    idRolePermission: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idRole: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idPermission: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  { timestamps: true, updatedAt: false }
);

export default RolePermission;
