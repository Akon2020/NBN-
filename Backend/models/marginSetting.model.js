import { DataTypes } from "sequelize";
import db from "../database/db.js";

// GOAL 9 — un pourcentage de marge par défaut par type de bien, seule
// source de vérité pour le calcul automatique en l'absence d'override sur
// un bien précis (Property.marginOverridePercentage).
const MarginSetting = db.define(
  "marginSettings",
  {
    idMarginSetting: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
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
      unique: true,
    },
    defaultPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10,
    },
    updatedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default MarginSetting;
