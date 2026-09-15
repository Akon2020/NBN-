import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CDC §3 module 3 "FICHE BAILLEUR" — client VIP, fiche plus riche qu'un
// simple locataire (relation commerciale suivie sur la durée).
const Bailleur = db.define(
  "bailleurs",
  {
    idBailleur: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    // GOAL 6 — même principe que Client.dossierNumber (voir ce modèle).
    dossierNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      unique: true,
    },
    idPerson: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    // Statut du responsable du bien vis-à-vis de l'agence.
    type: {
      type: DataTypes.ENUM("PROPRIETAIRE", "MANDATAIRE", "GERANT", "SOCIETE"),
      allowNull: false,
    },
    typeCollaboration: {
      type: DataTypes.ENUM("OCCASIONNELLE", "REGULIERE", "EXCLUSIVE"),
      allowNull: true,
    },
    dureeCollaboration: DataTypes.STRING(50),
    // Champ sensible (BACK-G03) — filtré en sérialisation selon
    // bailleur:marge:read, même logique que Property.margin.
    margeAgence: DataTypes.DECIMAL(12, 2),
    frequenceContactJours: DataTypes.INTEGER,
    dernierContact: DataTypes.DATE,
    prochainContact: DataTypes.DATE,
    notes: DataTypes.TEXT,
    fiabilite: {
      type: DataTypes.ENUM("SERIEUX", "MOYEN", "DIFFICILE"),
      allowNull: true,
    },
    // Relevées à la collecte terrain : ce sont des positions du bailleur
    // (valables pour tous ses biens), pas des attributs d'un bien précis.
    disponibiliteVisite: {
      type: DataTypes.ENUM("OUI", "NON", "SUR_PROGRAMME"),
      allowNull: true,
    },
    accepteCommission: {
      type: DataTypes.ENUM("OUI", "NON", "A_NEGOCIER"),
      allowNull: true,
    },
    restrictions: DataTypes.STRING(255),
    exigencesFinancieres: DataTypes.TEXT,
    // Profil défini par l'agence : ordonne la liste des bailleurs.
    priorite: {
      type: DataTypes.ENUM("VIP", "PREMIUM", "STANDARD", "INACTIF"),
      allowNull: false,
      defaultValue: "STANDARD",
    },
    photo: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    statutRelation: {
      type: DataTypes.ENUM("ACTIF", "INACTIF", "A_RELANCER", "SUSPENDU"),
      allowNull: false,
      defaultValue: "ACTIF",
    },
    valeurBailleur: {
      type: DataTypes.ENUM("FAIBLE", "MOYEN", "FORT", "PARTENAIRE_CLE"),
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default Bailleur;
