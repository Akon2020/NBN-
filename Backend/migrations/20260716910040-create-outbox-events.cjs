"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("outboxEvents", {
      idOutboxEvent: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      eventType: { type: Sequelize.STRING(100), allowNull: false },
      payload: { type: Sequelize.TEXT, allowNull: false },
      statut: {
        type: Sequelize.ENUM("PENDING", "PROCESSING", "SENT", "FAILED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      lastError: { type: Sequelize.TEXT, allowNull: true },
      processedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("outboxEvents", ["statut"], {
      name: "outbox_events_statut_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("outboxEvents");
  },
};
