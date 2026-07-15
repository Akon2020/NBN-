"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("requisitions", {
      idRequisition: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      demandeurId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      idCaisse: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "caisses", key: "idCaisse" },
      },
      nature: { type: Sequelize.STRING(255), allowNull: false },
      quantite: { type: Sequelize.INTEGER, allowNull: true },
      coutEstime: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      currencyCode: {
        type: Sequelize.STRING(3),
        allowNull: false,
        references: { model: "currencies", key: "code" },
      },
      justificatif: { type: Sequelize.TEXT, allowNull: true },
      statut: {
        type: Sequelize.ENUM("SOUMISE", "COMPLEMENT_DEMANDE", "APPROUVEE", "REJETEE"),
        allowNull: false,
        defaultValue: "SOUMISE",
      },
      motifDecision: { type: Sequelize.TEXT, allowNull: true },
      validationCode: { type: Sequelize.STRING(50), allowNull: true, unique: true },
      decidedBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      decidedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("requisitions");
  },
};
