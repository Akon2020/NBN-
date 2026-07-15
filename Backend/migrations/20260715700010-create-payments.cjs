"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payments", {
      idPayment: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      type: { type: Sequelize.ENUM("ENCAISSEMENT", "DECAISSEMENT"), allowNull: false },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      currencyCode: {
        type: Sequelize.STRING(3),
        allowNull: false,
        references: { model: "currencies", key: "code" },
      },
      idCaisse: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "caisses", key: "idCaisse" },
      },
      idPaymentMethod: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "paymentMethods", key: "idPaymentMethod" },
      },
      idRequisition: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "requisitions", key: "idRequisition" },
      },
      statut: {
        type: Sequelize.ENUM(
          "recorded_manually",
          "initiated",
          "provider_confirmed",
          "pending",
          "failed",
          "cancelled",
          "reconciled"
        ),
        allowNull: false,
        defaultValue: "recorded_manually",
      },
      description: { type: Sequelize.STRING(255), allowNull: true },
      // Auto-référence volontairement sans contrainte FK MySQL (évite la
      // complexité d'un ALTER TABLE différé sur une table qui se crée
      // elle-même) — intégrité maintenue au niveau applicatif
      // (payment.controller.js `cancelPayment`).
      reversalOfPaymentId: { type: Sequelize.BIGINT, allowNull: true },
      recordedBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("payments");
  },
};
