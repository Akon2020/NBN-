"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Curseur de relève par boîte : dernier UID IMAP traité. UIDVALIDITY
    // change si le serveur renumérote la boîte — le curseur repart alors de
    // la position courante au lieu de réimporter tout l'historique.
    await queryInterface.createTable("mailboxStates", {
      mailboxKey: { type: Sequelize.STRING(50), primaryKey: true },
      uidValidity: { type: Sequelize.STRING(50), allowNull: true },
      lastUid: { type: Sequelize.BIGINT, allowNull: true },
      lastPolledAt: { type: Sequelize.DATE, allowNull: true },
      // Message d'erreur technique uniquement, jamais d'identifiant.
      lastError: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // Copie du message reçu sur une boîte professionnelle : le système ne
    // modifie jamais la boîte elle-même (relève en lecture seule, messages
    // laissés « non lus » pour l'équipe qui utilise aussi le webmail).
    await queryInterface.createTable("inboundEmails", {
      idInboundEmail: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      mailboxKey: { type: Sequelize.STRING(50), allowNull: false },
      mailboxAddress: { type: Sequelize.STRING(150), allowNull: false },
      uid: { type: Sequelize.BIGINT, allowNull: true },
      messageId: { type: Sequelize.STRING(255), allowNull: false },
      fromName: { type: Sequelize.STRING(255), allowNull: true },
      fromAddress: { type: Sequelize.STRING(255), allowNull: true },
      toAddresses: { type: Sequelize.TEXT, allowNull: true },
      subject: { type: Sequelize.STRING(500), allowNull: true },
      textBody: { type: Sequelize.TEXT("medium"), allowNull: true },
      receivedAt: { type: Sequelize.DATE, allowNull: false },
      repliedAt: { type: Sequelize.DATE, allowNull: true },
      repliedBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("inboundEmails", ["mailboxKey", "messageId"], {
      unique: true,
      name: "inbound_emails_mailbox_message",
    });
    await queryInterface.addIndex("inboundEmails", ["mailboxKey", "receivedAt"]);

    // Réponses envoyées depuis le site : trace de qui a répondu quoi, y
    // compris les envois échoués (jamais d'échec silencieux).
    await queryInterface.createTable("inboundEmailReplies", {
      idInboundEmailReply: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idInboundEmail: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "inboundEmails", key: "idInboundEmail" },
        onDelete: "CASCADE",
      },
      idUser: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      body: { type: Sequelize.TEXT, allowNull: false },
      statut: { type: Sequelize.ENUM("SENT", "FAILED"), allowNull: false },
      error: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("inboundEmailReplies");
    await queryInterface.dropTable("inboundEmails");
    await queryInterface.dropTable("mailboxStates");
  },
};
