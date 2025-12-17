import { DataTypes } from "sequelize";
import db from "../database/db.js";

const SaleProperty = db.define("saleProperties", {
  idProperty: {
    type: DataTypes.BIGINT,
    primaryKey: true,
  },
});

export default SaleProperty;
