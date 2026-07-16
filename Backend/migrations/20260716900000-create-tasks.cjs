"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("tasks", {
      idTask: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      statut: {
        type: Sequelize.ENUM("A_FAIRE", "EN_COURS", "EN_REVISION", "TERMINEE"),
        allowNull: false,
        defaultValue: "A_FAIRE",
      },
      priorite: {
        type: Sequelize.ENUM("BASSE", "NORMALE", "HAUTE", "URGENTE"),
        allowNull: false,
        defaultValue: "NORMALE",
      },
      dateEcheance: { type: Sequelize.DATEONLY, allowNull: true },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("tasks");
  },
};
