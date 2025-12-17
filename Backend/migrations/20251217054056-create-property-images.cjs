"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("propertyImages", {
      idPropertyImage: {
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
      image: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("propertyImages");
  },
};
