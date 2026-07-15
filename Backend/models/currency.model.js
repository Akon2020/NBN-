import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — table de référence configurable (USD/CDF pré-remplies via
// seeder, extensible sans migration). `code` est la clé métier (ISO 4217),
// pas un id auto-increment, pour rester lisible dans les FK de CaisseBalance
// et ExchangeRate.
const Currency = db.define(
  "currencies",
  {
    code: {
      type: DataTypes.STRING(3),
      primaryKey: true,
    },
    label: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    symbol: {
      type: DataTypes.STRING(5),
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

export default Currency;
