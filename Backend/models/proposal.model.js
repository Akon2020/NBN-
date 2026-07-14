import { DataTypes } from "sequelize";
import db from "../database/db.js";

const Proposal = db.define("proposals", {
  idProposal: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  idProperty: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: "properties",
      key: "idProperty",
    },
  },
  // BACK-G07 : remplace les champs clientName/clientPhone jamais activés
  // par un vrai lien vers un Client.
  idClient: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: "clients",
      key: "idClient",
    },
  },
  message: DataTypes.TEXT,
  sentAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

export default Proposal;
