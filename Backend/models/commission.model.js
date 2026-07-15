import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — "Commission (calculée à partir d'une transaction
// immobilière conclue) → devient éligible à un Payment lorsqu'elle est due
// → suit le même chemin Payment→CashMovement→LedgerEntry." Une Commission
// n'est jamais elle-même un mouvement de caisse : elle ne fait que
// documenter un montant dû, jusqu'à ce qu'un Payment (BACK-G14) la
// référence (`Payment.idCommission`) pour la décaisser réellement.
//
// `beneficiaireType` distingue les trois bénéficiaires possibles du CDC
// (agence/agent/commissionnaire) : seul un des deux champs `idCommissionnaire`
// / `beneficiaireUserId` est renseigné selon le cas, jamais les deux.
const Commission = db.define(
  "commissions",
  {
    idCommission: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idClient: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idProperty: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    beneficiaireType: {
      type: DataTypes.ENUM("AGENCE", "AGENT", "COMMISSIONNAIRE"),
      allowNull: false,
    },
    beneficiaireUserId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    idCommissionnaire: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    montantTransaction: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    currencyCode: {
      type: DataTypes.STRING(3),
      allowNull: false,
    },
    tauxCommission: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    montantCommission: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    idCaisse: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM("CALCULEE", "DUE", "PAYEE", "ANNULEE"),
      allowNull: false,
      defaultValue: "CALCULEE",
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  { timestamps: true }
);

export default Commission;
