"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("propertyPhones", {
      idPropertyPhone: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idProperty: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "properties",
          key: "idProperty",
        },
        onDelete: "CASCADE",
      },
      phoneNumber: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("propertyPhones");
  },
};
