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
  // BACK-G05 : statut réel du bien (CDC §4) — remplace le filtrage cassé
  // retiré en SEC-G04, qui portait sur un champ inexistant.
  statut: {
    type: DataTypes.ENUM("DISPONIBLE", "RESERVE", "LOUE_VENDU"),
    allowNull: false,
    defaultValue: "DISPONIBLE",
  },
  // Source terrain (CDC §4) : code du commissionnaire ayant apporté le
  // bien, ou nom de l'informateur — les deux optionnels et exclusifs en
  // pratique, jamais combinés à un contrôle strict au niveau schéma.
  codeCommissionnaire: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  informateur: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.BIGINT,
    references: {
      model: "users",
      key: "idUser",
    },
  },
  // Préparé mais inerte en V1 (CLAUDE.md §5) : le cloisonnement par
  // agent/zone n'est pas encore une règle d'autorisation active.
  assignedTo: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: "users",
      key: "idUser",
    },
  },
  // Bailleur ayant fourni ce bien (CDC §3 "Biens associés" — lien direct
  // avec le module biens).
  idBailleur: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: "bailleurs",
      key: "idBailleur",
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
