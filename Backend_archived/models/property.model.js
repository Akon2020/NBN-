import { DataTypes } from "sequelize";
import db from "../database/db.js";

const Property = db.define("properties", {
  idProperty: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  category: {
    type: DataTypes.ENUM("RENT", "SALE"),
    allowNull: false,
  },
  propertyType: {
    type: DataTypes.ENUM(
      "APPARTEMENT",
      "MAISON",
      "CONSTRUCTION_DURABLE",
      "CONSTRUCTION_SEMI_DURABLE",
      "TERRAIN_PLAT",
      "TERRAIN_PENTE"
    ),
    allowNull: false,
  },
  quartier: DataTypes.STRING,
  avenue: DataTypes.STRING,
  fullAddress: DataTypes.STRING,
  floors: DataTypes.INTEGER,
  bedrooms: DataTypes.INTEGER,
  livingRooms: DataTypes.INTEGER,
  toilets: DataTypes.INTEGER,
  kitchens: DataTypes.INTEGER,
  price: DataTypes.DECIMAL(12, 2),
  margin: DataTypes.DECIMAL(12, 2),
  latitude: DataTypes.DECIMAL(10, 8),
  longitude: DataTypes.DECIMAL(11, 8),
  description: DataTypes.TEXT,
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.BIGINT,
    references: {
      model: "users",
      key: "idUser",
    },
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

export default Property;
