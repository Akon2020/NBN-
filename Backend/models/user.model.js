import { DataTypes } from "sequelize";
import db from "../database/db.js";

const User = db.define("users", {
  idUser: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  fullName: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    unique: true,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("admin", "agent", "consultant"),
    defaultValue: "agent",
  },
  avatar: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
    defaultValue: "ACTIVE",
  },
  lastLoginAt: DataTypes.DATE,
});

export default User;
