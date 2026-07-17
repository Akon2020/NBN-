"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("timelineEvents", {
      idTimelineEvent: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      entityType: {
        type: Sequelize.ENUM("PROPERTY", "CLIENT", "COMMISSIONNAIRE", "BAILLEUR"),
        allowNull: false,
      },
      entityId: { type: Sequelize.BIGINT, allowNull: false },
      eventType: { type: Sequelize.STRING(50), allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      actorUserId: { type: Sequelize.BIGINT, allowNull: true },
      occurredAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("timelineEvents", ["entityType", "entityId", "occurredAt"], {
      name: "timeline_events_entity_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("timelineEvents");
  },
};
