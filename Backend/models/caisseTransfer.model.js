import { DataTypes } from "sequelize";
import db from "../database/db.js";

// GOAL 10 — un virement entre deux caisses, dans une seule devise (jamais
// de conversion implicite, cf. CLAUDE.md §4). Ancre deux CashMovement (une
// SORTIE côté source, une ENTREE côté destination) exactement comme
// `Payment` ancre les mouvements liés à un encaissement/décaissement —
// jamais de mouvement "flottant" sans origine traçable. Immuable une fois
// créé (pas d'updatedAt) : une correction passe par un nouveau virement en
// sens inverse, jamais une modification de celui-ci.
const CaisseTransfer = db.define(
  "caisseTransfers",
  {
    idCaisseTransfer: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    idCaisseSource: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    idCaisseDestination: {
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  { timestamps: true, updatedAt: false }
);

export default CaisseTransfer;
