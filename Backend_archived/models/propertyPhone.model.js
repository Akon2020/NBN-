import { DataTypes } from "sequelize";
import db from "../database/db.js";

const PropertyPhone = db.define("propertyPhones", {
  idPropertyPhone: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  idProperty: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "properties",
      key: "idProperty",
    },
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
});

export default PropertyPhone;
