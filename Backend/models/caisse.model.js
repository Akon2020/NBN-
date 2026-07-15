import { DataTypes } from "sequelize";
import db from "../database/db.js";

// CLAUDE.md §4 — caisses multiples, chacune avec un responsable et un
// statut. Le solde par devise vit dans CaisseBalance (jamais mélangé,
// voir caisseBalance.model.js), pas ici.
const Caisse = db.define(
  "caisses",
  {
    idCaisse: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    label: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    responsableUserId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM("OUVERTE", "CLOTUREE"),
      allowNull: false,
      defaultValue: "OUVERTE",
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

export default Caisse;
