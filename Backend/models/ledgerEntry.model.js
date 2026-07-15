import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — écriture append-only : aucune LedgerEntry validée n'est
// jamais modifiée ni supprimée après création (pas de route PATCH/DELETE
// exposée dans ledgerEntry.controller.js, volontairement). Une correction
// se fait uniquement par une nouvelle écriture d'ajustement/annulation
// (voir Payment.reversalOfPaymentId), jamais par UPDATE silencieux.
// `balanceAfter` fige le solde de la caisse/devise immédiatement après
// cette écriture, pour un audit qui ne dépend pas d'un recalcul a posteriori.
const LedgerEntry = db.define(
  "ledgerEntries",
  {
    idLedgerEntry: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idCaisse: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    currencyCode: {
      type: DataTypes.STRING(3),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("ENTREE", "SORTIE"),
      allowNull: false,
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    idCashMovement: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  { timestamps: true, updatedAt: false }
);

export default LedgerEntry;
