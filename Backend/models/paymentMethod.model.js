import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — Payment découplé de PaymentMethod (espèces/virement/
// Mobile Money). Table de référence, jamais supprimée une fois utilisée
// (désactivation via isActive, même principe que Currency).
const PaymentMethod = db.define(
  "paymentMethods",
  {
    idPaymentMethod: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  { timestamps: true }
);

export default PaymentMethod;
