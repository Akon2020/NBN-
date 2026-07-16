"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("alerts", {
      idAlert: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      type: { type: Sequelize.STRING(100), allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      severite: {
        type: Sequelize.ENUM("INFO", "AVERTISSEMENT", "CRITIQUE"),
        allowNull: false,
        defaultValue: "AVERTISSEMENT",
      },
      statut: {
        type: Sequelize.ENUM("OUVERTE", "RECONNUE", "ASSIGNEE", "EN_COURS", "RESOLUE", "CLOTUREE"),
        allowNull: false,
        defaultValue: "OUVERTE",
      },
      assignedTo: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      relatedEntityType: { type: Sequelize.STRING(50), allowNull: true },
      relatedEntityId: { type: Sequelize.BIGINT, allowNull: true },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      resolvedBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      resolvedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("alerts");
  },
};
