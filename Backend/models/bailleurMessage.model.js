import { DataTypes } from "sequelize";
import db from "../database/db.js";

// Un échange avec un bailleur : e-mail envoyé, appel / WhatsApp / SMS lancé,
// ou message prévu par une relance.
const BailleurMessage = db.define(
  "bailleurMessages",
  {
    idBailleurMessage: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    idBailleur: { type: DataTypes.BIGINT, allowNull: false },
    channel: { type: DataTypes.ENUM("EMAIL", "WHATSAPP", "SMS", "APPEL"), allowNull: false },
    subject: { type: DataTypes.STRING(255), allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: true },
    statut: {
      type: DataTypes.ENUM("PLANIFIE", "A_ENVOYER", "ENVOYE", "ECHEC", "ANNULE"),
      allowNull: false,
      defaultValue: "ENVOYE",
    },
    idOutboxEvent: { type: DataTypes.BIGINT, allowNull: true },
    sentBy: { type: DataTypes.BIGINT, allowNull: true },
    sentAt: { type: DataTypes.DATE, allowNull: true },
  },
  { timestamps: true }
);

export default BailleurMessage;
