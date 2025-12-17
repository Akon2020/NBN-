"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("activityLogs", {
      idActivityLog: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idUser: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "users",
          key: "idUser",
        },
        onDelete: "CASCADE",
      },
      action: Sequelize.STRING,
      entity: Sequelize.STRING,
      entityId: Sequelize.BIGINT,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("activityLogs");
  },
};
