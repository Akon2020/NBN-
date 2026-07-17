"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("caisseTransfers", {
      idCaisseTransfer: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idCaisseSource: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "caisses", key: "idCaisse" },
      },
      idCaisseDestination: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "caisses", key: "idCaisse" },
      },
      currencyCode: { type: Sequelize.STRING(3), allowNull: false },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.changeColumn("cashMovements", "idPayment", {
      type: Sequelize.BIGINT,
      allowNull: true,
    });

    await queryInterface.addColumn("cashMovements", "idCaisseTransfer", {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: "caisseTransfers", key: "idCaisseTransfer" },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("cashMovements", "idCaisseTransfer");
    await queryInterface.changeColumn("cashMovements", "idPayment", {
      type: Sequelize.BIGINT,
      allowNull: false,
    });
    await queryInterface.dropTable("caisseTransfers");
  },
};
