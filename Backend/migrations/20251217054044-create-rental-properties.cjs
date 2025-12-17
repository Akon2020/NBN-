"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("rentalProperties", {
      idProperty: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        references: {
          model: "properties",
          key: "idProperty",
        },
        onDelete: "CASCADE",
      },
      guarantee: Sequelize.DECIMAL(12, 2),
      unit: {
        type: Sequelize.ENUM("DAY", "MONTH", "YEAR"),
        allowNull: false,
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("rentalProperties");
  },
};
