import { DataTypes } from "sequelize";
import db from "../database/db.js";

const PropertyImage = db.define("propertyImages", {
  idPropertyImage: {
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
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

export default PropertyImage;
