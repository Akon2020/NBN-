"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("caisses", {
      idCaisse: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      label: { type: Sequelize.STRING(150), allowNull: false },
      responsableUserId: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      statut: {
        type: Sequelize.ENUM("OUVERTE", "CLOTUREE"),
        allowNull: false,
        defaultValue: "OUVERTE",
      },
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
    await queryInterface.dropTable("caisses");
  },
};
