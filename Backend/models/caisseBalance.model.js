import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — un solde par devise et par caisse, jamais mélangés. Une
// ligne est créée automatiquement pour chaque devise active au moment de
// la création d'une Caisse (voir caisse.controller.js) ; elle est ensuite
// mise à jour uniquement via des CashMovement (BACK-G14), jamais modifiée
// directement par un utilisateur.
const CaisseBalance = db.define(
  "caisseBalances",
  {
    idCaisseBalance: {
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
    balance: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    indexes: [{ unique: true, fields: ["idCaisse", "currencyCode"] }],
  }
);

export default CaisseBalance;
