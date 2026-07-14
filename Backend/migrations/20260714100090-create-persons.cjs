"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("persons", {
      idPerson: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      fullName: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      idNumber: {
        // pièce d'identité, optionnelle
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      idUser: {
        // 0-1 : une Person peut ne jamais se connecter (CLAUDE.md §4)
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
        onDelete: "SET NULL",
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("persons");
  },
};
