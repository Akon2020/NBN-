"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("exchangeRates", {
      idExchangeRate: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      fromCurrency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        references: { model: "currencies", key: "code" },
      },
      toCurrency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        references: { model: "currencies", key: "code" },
      },
      rate: { type: Sequelize.DECIMAL(14, 6), allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      source: { type: Sequelize.STRING(150), allowNull: true },
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
    await queryInterface.dropTable("exchangeRates");
  },
};
