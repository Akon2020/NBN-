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
  // GOAL 2 — réorganisation manuelle de la galerie, jamais déduite de
  // l'ordre d'upload (qui n'est pas toujours l'ordre voulu à l'affichage).
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
});

export default PropertyImage;
