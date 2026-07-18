import { DataTypes } from "sequelize";
import db from "../database/db.js";

// GOAL 13 — centre de configuration générique (clé/valeur JSON), distinct
// de `MarginSetting` (déjà dédié et structuré pour les marges, GOAL 9) :
// couvre les autres paramètres métier transverses (panier, coordonnées de
// l'agence, interrupteurs de fonctionnalité) sans dupliquer ce mécanisme
// pour chacun. `value` est toujours du JSON sérialisé — jamais une chaîne
// brute — pour rester uniforme quel que soit le type réel (nombre,
// booléen, objet).
const AppSetting = db.define(
  "appSettings",
  {
    idAppSetting: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default AppSetting;
