import { DataTypes } from "sequelize";
import db from "../database/db.js";

// GOAL 9 — un pourcentage de marge par défaut par type de bien, seule
// source de vérité pour le calcul automatique en l'absence d'override sur
// un bien précis (Property.marginOverridePercentage).
// GOAL 12 — deuxième dimension `stayType` : la courte durée (location
// journalière) justifie généralement un pourcentage distinct de la longue
// durée pour un même type de bien (rotation/coûts de gestion différents).
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
    },
    stayType: {
      type: DataTypes.ENUM("LONGUE_DUREE", "COURT_SEJOUR"),
      allowNull: false,
      defaultValue: "LONGUE_DUREE",
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
  {
    timestamps: true,
    indexes: [{ unique: true, fields: ["propertyType", "stayType"] }],
  }
);

export default MarginSetting;
