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
  //   clientName: DataTypes.STRING,
  //   clientPhone: DataTypes.STRING(20),
  message: DataTypes.TEXT,
  sentAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

export default Proposal;
