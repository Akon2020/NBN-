"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("commissions", {
      idCommission: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idClient: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "clients", key: "idClient" },
      },
      idProperty: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "properties", key: "idProperty" },
      },
      beneficiaireType: {
        type: Sequelize.ENUM("AGENCE", "AGENT", "COMMISSIONNAIRE"),
        allowNull: false,
      },
      beneficiaireUserId: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      idCommissionnaire: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "commissionnaires", key: "idCommissionnaire" },
      },
      montantTransaction: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      currencyCode: {
        type: Sequelize.STRING(3),
        allowNull: false,
        references: { model: "currencies", key: "code" },
      },
      tauxCommission: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      montantCommission: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      idCaisse: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "caisses", key: "idCaisse" },
      },
      statut: {
        type: Sequelize.ENUM("CALCULEE", "DUE", "PAYEE", "ANNULEE"),
        allowNull: false,
        defaultValue: "CALCULEE",
      },
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
    await queryInterface.dropTable("commissions");
  },
};
