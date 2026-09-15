"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Historique des échanges avec un bailleur : e-mails envoyés depuis le
    // site, appels / WhatsApp / SMS lancés depuis « Contacts », et messages
    // prévus par une relance (idRelance, ajouté avec les relances).
    await queryInterface.createTable("bailleurMessages", {
      idBailleurMessage: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idBailleur: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "bailleurs", key: "idBailleur" },
        onDelete: "CASCADE",
      },
      channel: { type: Sequelize.ENUM("EMAIL", "WHATSAPP", "SMS", "APPEL"), allowNull: false },
      subject: { type: Sequelize.STRING(255), allowNull: true },
      body: { type: Sequelize.TEXT, allowNull: true },
      // PLANIFIE : relance future ; A_ENVOYER : WhatsApp prêt, en attente du
      // clic de l'agent ; ENVOYE : parti (ou mis en file pour un e-mail).
      statut: {
        type: Sequelize.ENUM("PLANIFIE", "A_ENVOYER", "ENVOYE", "ECHEC", "ANNULE"),
        allowNull: false,
        defaultValue: "ENVOYE",
      },
      idOutboxEvent: { type: Sequelize.BIGINT, allowNull: true },
      sentBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      sentAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("bailleurMessages", ["idBailleur", "createdAt"], {
      name: "bailleur_messages_bailleur_created",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("bailleurMessages");
  },
};
