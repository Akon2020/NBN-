"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("payments", "idCommission", {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: "commissions", key: "idCommission" },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("payments", "idCommission");
  },
};
