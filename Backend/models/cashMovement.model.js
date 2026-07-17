import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — un mouvement de caisse n'est jamais automatiquement une
// commission ni une réquisition : c'est une conséquence d'un Payment
// comptabilisé, toujours rattachée à une caisse et une devise précises.
const CashMovement = db.define(
  "cashMovements",
  {
    idCashMovement: {
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
    // GOAL 10 — nullable : un mouvement peut désormais provenir d'un
    // virement entre caisses (idCaisseTransfer) plutôt que d'un paiement.
    // Toujours l'un OU l'autre en pratique, jamais les deux ni aucun des
    // deux (contrôlé en application, cf. payment.controller.js /
    // caisse.controller.js — jamais un mouvement sans origine traçable).
    idPayment: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    idCaisseTransfer: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  { timestamps: true, updatedAt: false }
);

export default CashMovement;
