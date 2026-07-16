import { DataTypes } from "sequelize";
import db from "../database/db.js";

// info.md §6 — "Feuille de route pour le workflow du système digital de
// validation des besoins" : Saisie → Vérification → Approbation →
// Génération (PDF) → Archivage.
//
// La Vérification (champs obligatoires + conformité budgétaire, ex. la
// devise demandée doit être une devise réellement suivie par la caisse
// ciblée) est un contrôle synchrone au moment de la Saisie (requisition.
// controller.js) — elle n'a pas son propre statut, une réquisition qui ne
// passe pas ce contrôle n'est simplement jamais créée (400).
//
// `validationCode` est généré uniquement à l'Approbation (unique, sert de
// preuve d'authenticité sur le PDF généré à la demande — voir
// utils/requisitionPdf.js). L'Archivage n'est pas un statut distinct : une
// réquisition approuvée/rejetée n'est jamais supprimée, elle reste
// consultable et filtrable indéfiniment (traçabilité qui/quand/montant).
const Requisition = db.define(
  "requisitions",
  {
    idRequisition: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    demandeurId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idCaisse: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    nature: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    quantite: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    coutEstime: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    currencyCode: {
      type: DataTypes.STRING(3),
      allowNull: false,
    },
    justificatif: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM("SOUMISE", "COMPLEMENT_DEMANDE", "APPROUVEE", "REJETEE"),
      allowNull: false,
      defaultValue: "SOUMISE",
    },
    motifDecision: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    validationCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    decidedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    decidedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // BACK-G21 — archivage métier (CLAUDE.md §11) : une réquisition
    // approuvée/rejetée ancienne devient archivable pour désencombrer les
    // listes actives, sans jamais être supprimée (le commentaire
    // précédent de ce fichier, "l'archivage n'est pas un statut distinct",
    // reste vrai pour `statut` — l'archivage est une couche orthogonale,
    // pas un nouveau statut de workflow). `deletedAt` (paranoid) reste un
    // filet de sécurité distinct pour une erreur de saisie pure.
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    archiveReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { timestamps: true, paranoid: true }
);

export default Requisition;
