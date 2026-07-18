"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("calendarEventParticipants", {
      idCalendarEventParticipant: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idCalendarEvent: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "calendarEvents", key: "idCalendarEvent" },
        onDelete: "CASCADE",
      },
      idUser: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("calendarEventParticipants", ["idCalendarEvent", "idUser"], {
      unique: true,
      name: "calendar_event_participants_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("calendarEventParticipants");
  },
};
