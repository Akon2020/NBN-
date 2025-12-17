"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("saleProperties", {
      idProperty: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        references: {
          model: "properties",
          key: "idProperty",
        },
        onDelete: "CASCADE",
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("saleProperties");
  },
};
