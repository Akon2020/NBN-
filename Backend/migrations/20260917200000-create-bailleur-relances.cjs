"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Relance programmée : une date, un canal, un message, des bailleurs
    // (un bailleurMessage PLANIFIE par destinataire).
    await queryInterface.createTable("bailleurRelances", {
      idRelance: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      channel: { type: Sequelize.ENUM("EMAIL", "WHATSAPP"), allowNull: false },
      subject: { type: Sequelize.STRING(200), allowNull: true },
      message: { type: Sequelize.TEXT, allowNull: false },
      scheduledAt: { type: Sequelize.DATE, allowNull: false },
      // EN_COURS : prise en charge (e-mails en file) ou WhatsApp en attente des
      // clics de l'agent ; TERMINEE : tout est parti.
      statut: {
        type: Sequelize.ENUM("PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"),
        allowNull: false,
        defaultValue: "PLANIFIEE",
      },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      processedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("bailleurRelances", ["statut", "scheduledAt"], {
      name: "bailleur_relances_due",
    });

    await queryInterface.addColumn("bailleurMessages", "idRelance", {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: "bailleurRelances", key: "idRelance" },
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("bailleurMessages", "idRelance");
    await queryInterface.dropTable("bailleurRelances");
  },
};
