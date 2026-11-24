import { DataTypes } from "sequelize";
import db from "../database/db.js";

// Message reçu marqué lu par un utilisateur (état propre à chacun).
const InboundEmailRead = db.define(
  "inboundEmailReads",
  {
    idInboundEmail: { type: DataTypes.BIGINT, primaryKey: true },
    idUser: { type: DataTypes.BIGINT, primaryKey: true },
    readAt: { type: DataTypes.DATE, allowNull: false },
  },
  { timestamps: false }
);

export default InboundEmailRead;
