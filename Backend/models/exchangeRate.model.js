import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — pour le reporting consolidé multi-devises uniquement.
// Un total multi-devises ne s'additionne jamais silencieusement : tout
// calcul consolidé doit passer explicitement par un taux tracé (from, to,
// rate, date, source), jamais un taux implicite.
const ExchangeRate = db.define(
  "exchangeRates",
  {
    idExchangeRate: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    fromCurrency: {
      type: DataTypes.STRING(3),
      allowNull: false,
    },
    toCurrency: {
      type: DataTypes.STRING(3),
      allowNull: false,
    },
    rate: {
      type: DataTypes.DECIMAL(14, 6),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default ExchangeRate;
