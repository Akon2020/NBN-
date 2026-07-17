"use strict";

const PROPERTY_TYPES = [
  "APPARTEMENT",
  "MAISON",
  "CONSTRUCTION_DURABLE",
  "CONSTRUCTION_SEMI_DURABLE",
  "TERRAIN_PLAT",
  "TERRAIN_PENTE",
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("marginSettings", {
      idMarginSetting: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      propertyType: {
        type: Sequelize.ENUM(...PROPERTY_TYPES),
        allowNull: false,
        unique: true,
      },
      defaultPercentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 10 },
      updatedBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("marginHistories", {
      idMarginHistory: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      scope: { type: Sequelize.ENUM("GLOBAL", "PROPERTY"), allowNull: false },
      propertyType: { type: Sequelize.STRING, allowNull: true },
      idProperty: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "properties", key: "idProperty" },
        onDelete: "CASCADE",
      },
      previousPercentage: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      newPercentage: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      actorUserId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addColumn("properties", "marginOverridePercentage", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
    });

    const now = new Date();
    await queryInterface.bulkInsert(
      "marginSettings",
      PROPERTY_TYPES.map((propertyType) => ({
        propertyType,
        defaultPercentage: 10,
        createdAt: now,
        updatedAt: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("properties", "marginOverridePercentage");
    await queryInterface.dropTable("marginHistories");
    await queryInterface.dropTable("marginSettings");
  },
};
