import { DataTypes } from "sequelize";
import db from "../database/db.js";

const RentalProperty = db.define("rentalProperties", {
  idProperty: {
    type: DataTypes.BIGINT,
    primaryKey: true,
  },
  guarantee: DataTypes.DECIMAL(12, 2),
  unit: {
    type: DataTypes.ENUM("DAY", "MONTH", "YEAR"),
    allowNull: false,
  },
});

export default RentalProperty;
