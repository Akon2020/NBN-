"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("cashMovements", {
      idCashMovement: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idCaisse: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "caisses", key: "idCaisse" },
      },
      currencyCode: {
        type: Sequelize.STRING(3),
        allowNull: false,
        references: { model: "currencies", key: "code" },
      },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      type: { type: Sequelize.ENUM("ENTREE", "SORTIE"), allowNull: false },
      idPayment: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "payments", key: "idPayment" },
      },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("cashMovements");
  },
};
