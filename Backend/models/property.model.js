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
  // GOAL 9 — `margin` est désormais une valeur dérivée, jamais saisie
  // directement (retirée de PROPERTY_FIELDS) : toujours recalculée à
  // partir de `price` et du pourcentage effectif (override ou défaut
  // global par type, cf. shared/marginCalculator.js).
  margin: DataTypes.DECIMAL(12, 2),
  // Pourcentage propre à CE bien, prioritaire sur MarginSetting.
  // `null` = aucun override, le bien suit le défaut de son type.
  marginOverridePercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  latitude: DataTypes.DECIMAL(10, 8),
  longitude: DataTypes.DECIMAL(11, 8),
  description: DataTypes.TEXT,
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // GOAL 1 — cycle de vie du bien. "VENDU" n'est atteignable qu'en
  // category=SALE (contrôlé en application, pas au niveau du schéma — un
  // CHECK constraint conditionnel n'apporterait rien qu'une validation
  // applicative ne couvre déjà, cf. property.controller.js).
  statut: {
    type: DataTypes.ENUM(
      "DISPONIBLE",
      "OCCUPE_CLIENT_NBN",
      "OCCUPE_CLIENT_EXTERNE",
      "EN_MAINTENANCE",
      "VENDU"
    ),
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
  // BACK-G21 — soft delete (paranoid). Distinct de l'archivage métier
  // ci-dessous (CLAUDE.md §11) : `deletedAt` reste invisible en usage
  // normal et réversible à court terme (erreur de saisie), jamais un
  // aboutissement de cycle de vie métier.
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  archiveReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  paranoid: true,
});

export default Property;
