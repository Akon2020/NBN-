import { DataTypes } from "sequelize";
import db from "../database/db.js";

// Message reçu sur une boîte professionnelle (contact@, direction@…).
// Qui peut le voir n'est pas une permission RBAC mais l'audience de la
// boîte (config/mailboxes.js) — contrôlée côté Backend à chaque accès.
const InboundEmail = db.define(
  "inboundEmails",
  {
    idInboundEmail: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    mailboxKey: { type: DataTypes.STRING(50), allowNull: false },
    mailboxAddress: { type: DataTypes.STRING(150), allowNull: false },
    uid: { type: DataTypes.BIGINT, allowNull: true },
    messageId: { type: DataTypes.STRING(255), allowNull: false },
    fromName: { type: DataTypes.STRING(255), allowNull: true },
    fromAddress: { type: DataTypes.STRING(255), allowNull: true },
    toAddresses: { type: DataTypes.TEXT, allowNull: true },
    subject: { type: DataTypes.STRING(500), allowNull: true },
    textBody: { type: DataTypes.TEXT("medium"), allowNull: true },
    receivedAt: { type: DataTypes.DATE, allowNull: false },
    repliedAt: { type: DataTypes.DATE, allowNull: true },
    repliedBy: { type: DataTypes.BIGINT, allowNull: true },
  },
  { timestamps: true }
);

export default InboundEmail;
