"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("commissionnaireIncidents", {
      idIncident: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idCommissionnaire: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "commissionnaires", key: "idCommissionnaire" },
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM("RETARD", "DONNEES_INCOMPLETES", "NON_RESPECT_REGLES", "AUTRE"),
        allowNull: false,
      },
      gravite: {
        type: Sequelize.ENUM("MINEUR", "MODERE", "MAJEUR"),
        allowNull: false,
        defaultValue: "MINEUR",
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      impactDiscipline: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      dateIncident: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("commissionnaireIncidents");
  },
};
