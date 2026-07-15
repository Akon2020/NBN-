"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("caisseBalances", {
      idCaisseBalance: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idCaisse: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "caisses", key: "idCaisse" },
        onDelete: "CASCADE",
      },
      currencyCode: {
        type: Sequelize.STRING(3),
        allowNull: false,
        references: { model: "currencies", key: "code" },
      },
      balance: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("caisseBalances", ["idCaisse", "currencyCode"], {
      unique: true,
      name: "caisse_balances_unique_caisse_currency",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("caisseBalances");
  },
};
