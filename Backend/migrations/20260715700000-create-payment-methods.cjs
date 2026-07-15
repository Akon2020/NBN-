"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("paymentMethods", {
      idPaymentMethod: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      label: { type: Sequelize.STRING(100), allowNull: false },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("paymentMethods");
  },
};
