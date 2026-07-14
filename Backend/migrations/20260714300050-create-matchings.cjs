"use strict";

// BACK-G08 — CDC module 4 "MATCHING" : associer 1 client à plusieurs biens.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("matchings", {
      idMatching: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idClient: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "clients", key: "idClient" },
        onDelete: "CASCADE",
      },
      idProperty: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "properties", key: "idProperty" },
        onDelete: "CASCADE",
      },
      statut: {
        type: Sequelize.ENUM("EN_COURS", "PROPOSE", "VALIDE"),
        allowNull: false,
        defaultValue: "EN_COURS",
      },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addConstraint("matchings", {
      fields: ["idClient", "idProperty"],
      type: "unique",
      name: "matchings_client_property_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("matchings");
  },
};
