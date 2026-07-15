import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — Payment découplé de PaymentMethod/ProviderTransaction.
// V1 n'utilise que "recorded_manually" ; les autres statuts existent dès
// le schéma mais restent inertes jusqu'à une future intégration de
// fournisseur externe (même principe que `assignedTo` sur Property).
//
// Une correction ne modifie jamais un Payment déjà comptabilisé (ledger
// append-only) : elle crée un nouveau Payment de sens opposé, référencé via
// `reversalOfPaymentId`, qui traverse le même circuit CashMovement→
// LedgerEntry — voir payment.controller.js `cancelPayment`.
const Payment = db.define(
  "payments",
  {
    idPayment: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM("ENCAISSEMENT", "DECAISSEMENT"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    currencyCode: {
      type: DataTypes.STRING(3),
      allowNull: false,
    },
    idCaisse: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idPaymentMethod: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idRequisition: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    idCommission: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM(
        "recorded_manually",
        "initiated",
        "provider_confirmed",
        "pending",
        "failed",
        "cancelled",
        "reconciled"
      ),
      allowNull: false,
      defaultValue: "recorded_manually",
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reversalOfPaymentId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    recordedBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  { timestamps: true }
);

export default Payment;
