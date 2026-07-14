import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CDC §3 module 3 "FICHE CLIENT INTELLIGENTE". L'identité (nom, téléphone,
// email) vit sur Person — une même Person peut être Client ET Bailleur
// (CLAUDE.md §4).
const Client = db.define(
  "clients",
  {
    idClient: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idPerson: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("LOCATAIRE", "ACHETEUR"),
      allowNull: false,
    },
    sousType: {
      type: DataTypes.ENUM("PARTICULIER", "PROFESSIONNEL", "ENTREPRISE", "DIASPORA"),
      allowNull: true,
    },
    source: {
      type: DataTypes.ENUM("TERRAIN", "WHATSAPP", "APPEL", "RECOMMANDATION", "COMMISSIONNAIRE"),
      allowNull: true,
    },
    sourceCommissionnaireCode: DataTypes.STRING(50),
    besoinTypeBien: DataTypes.STRING(100),
    besoinUsage: {
      type: DataTypes.ENUM("HABITATION", "PROFESSIONNEL", "COMMERCIAL", "MIXTE"),
      allowNull: true,
    },
    localisationVille: DataTypes.STRING(100),
    localisationQuartiers: DataTypes.TEXT,
    localisationFlexibilite: {
      type: DataTypes.ENUM("STRICT", "FLEXIBLE"),
      allowNull: true,
    },
    budgetMin: DataTypes.DECIMAL(12, 2),
    budgetMax: DataTypes.DECIMAL(12, 2),
    urgence: {
      type: DataTypes.ENUM("IMMEDIAT", "1_2_SEMAINES", "1_MOIS", "FLEXIBLE"),
      allowNull: true,
    },
    dateSouhaitee: DataTypes.DATEONLY,
    score: {
      type: DataTypes.ENUM("SERIEUX", "MOYEN", "FAIBLE"),
      allowNull: true,
    },
    tags: DataTypes.STRING(255),
    // BACK-G08 — pipeline commercial (CDC §3 module 8).
    statutPipeline: {
      type: DataTypes.ENUM(
        "NOUVEAU",
        "PROPOSE",
        "VISITE_PROGRAMMEE",
        "VISITE_EFFECTUEE",
        "NEGOCIATION",
        "CONCLU",
        "PERDU"
      ),
      allowNull: false,
      defaultValue: "NOUVEAU",
    },
    statutRelance: {
      type: DataTypes.ENUM("A_RELANCER", "RELANCE", "INACTIF"),
      allowNull: true,
    },
    dernierContact: DataTypes.DATE,
    prochaineRelance: DataTypes.DATE,
    notesAgent: DataTypes.TEXT,
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default Client;
