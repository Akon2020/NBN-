"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reminders", {
      idReminder: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idUser: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
        onDelete: "CASCADE",
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: true },
      dueAt: { type: Sequelize.DATE, allowNull: false },
      statut: {
        type: Sequelize.ENUM("PLANIFIE", "ENVOYE", "ANNULE"),
        allowNull: false,
        defaultValue: "PLANIFIE",
      },
      relatedEntityType: { type: Sequelize.STRING(50), allowNull: true },
      relatedEntityId: { type: Sequelize.BIGINT, allowNull: true },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      sentAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("reminders", ["statut", "dueAt"], {
      name: "reminders_statut_dueat_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("reminders");
  },
};
