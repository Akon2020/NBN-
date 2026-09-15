import { DataTypes } from "sequelize";
import db from "../database/db.js";

// Réponse envoyée depuis le site à un message reçu, réussie ou non.
const InboundEmailReply = db.define(
  "inboundEmailReplies",
  {
    idInboundEmailReply: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    idInboundEmail: { type: DataTypes.BIGINT, allowNull: false },
    idUser: { type: DataTypes.BIGINT, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    statut: { type: DataTypes.ENUM("SENT", "FAILED"), allowNull: false },
    error: { type: DataTypes.TEXT, allowNull: true },
  },
  { timestamps: true }
);

export default InboundEmailReply;
