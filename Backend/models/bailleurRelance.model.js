import { DataTypes } from "sequelize";
import db from "../database/db.js";

// Relance programmée auprès d'une sélection de bailleurs (bouton « Relances »).
// Les destinataires sont des BailleurMessage liés par `idRelance`.
const BailleurRelance = db.define(
  "bailleurRelances",
  {
    idRelance: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    channel: { type: DataTypes.ENUM("EMAIL", "WHATSAPP"), allowNull: false },
    subject: { type: DataTypes.STRING(200), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    scheduledAt: { type: DataTypes.DATE, allowNull: false },
    statut: {
      type: DataTypes.ENUM("PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"),
      allowNull: false,
      defaultValue: "PLANIFIEE",
    },
    createdBy: { type: DataTypes.BIGINT, allowNull: true },
    processedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { timestamps: true }
);

export default BailleurRelance;
