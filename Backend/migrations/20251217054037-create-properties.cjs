"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("properties", {
      idProperty: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      category: {
        type: Sequelize.ENUM("RENT", "SALE"),
        allowNull: false,
      },
      propertyType: {
        type: Sequelize.ENUM(
          "APPARTEMENT",
          "MAISON",
          "CONSTRUCTION_DURABLE",
          "CONSTRUCTION_SEMI_DURABLE",
          "TERRAIN_PLAT",
          "TERRAIN_PENTE"
        ),
        allowNull: false,
      },
      quartier: Sequelize.STRING,
      avenue: Sequelize.STRING,
      fullAddress: Sequelize.STRING,
      floors: Sequelize.INTEGER,
      bedrooms: Sequelize.INTEGER,
      livingRooms: Sequelize.INTEGER,
      toilets: Sequelize.INTEGER,
      kitchens: Sequelize.INTEGER,
      price: Sequelize.DECIMAL(12, 2),
      margin: Sequelize.DECIMAL(12, 2),
      latitude: Sequelize.DECIMAL(10, 8),
      longitude: Sequelize.DECIMAL(11, 8),
      description: Sequelize.TEXT,
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdBy: {
        type: Sequelize.BIGINT,
        references: {
          model: "users",
          key: "idUser",
        },
        onDelete: "SET NULL",
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("properties");
  },
};
