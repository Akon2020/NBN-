"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("missions", {
      idMission: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      idCommissionnaire: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "commissionnaires", key: "idCommissionnaire" },
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM("COLLECTE_BIEN", "APPORT_CLIENT", "SUIVI"),
        allowNull: false,
      },
      statut: {
        type: Sequelize.ENUM("SOUMISE", "VALIDEE", "REJETEE", "CORRECTION_DEMANDEE"),
        allowNull: false,
        defaultValue: "SOUMISE",
      },
      idProperty: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "properties", key: "idProperty" },
      },
      idClient: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "clients", key: "idClient" },
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      motifRejet: { type: Sequelize.TEXT, allowNull: true },
      validatedBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      validatedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("missions");
  },
};
