"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("calendarEvents", {
      idCalendarEvent: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      startAt: { type: Sequelize.DATE, allowNull: false },
      endAt: { type: Sequelize.DATE, allowNull: true },
      idUser: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("calendarEvents", ["startAt"], {
      name: "calendar_events_startat_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("calendarEvents");
  },
};
