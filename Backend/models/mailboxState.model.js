import { DataTypes } from "sequelize";
import db from "../database/db.js";

// Curseur de relève IMAP d'une boîte professionnelle (voir
// services/inboundMail.service.js).
const MailboxState = db.define(
  "mailboxStates",
  {
    mailboxKey: { type: DataTypes.STRING(50), primaryKey: true },
    uidValidity: { type: DataTypes.STRING(50), allowNull: true },
    lastUid: { type: DataTypes.BIGINT, allowNull: true },
    lastPolledAt: { type: DataTypes.DATE, allowNull: true },
    lastError: { type: DataTypes.TEXT, allowNull: true },
  },
  { timestamps: true }
);

export default MailboxState;
