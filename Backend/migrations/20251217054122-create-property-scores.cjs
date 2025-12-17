"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("propertyScores", {
      idScore: {
        type: Sequelize.BIGINT,
        primaryKey: true,
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
      score: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("propertyScores");
  },
};
