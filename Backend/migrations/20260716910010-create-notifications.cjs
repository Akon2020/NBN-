"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notifications", {
      idNotification: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idUser: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
        onDelete: "CASCADE",
      },
      type: { type: Sequelize.STRING(100), allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: true },
      relatedEntityType: { type: Sequelize.STRING(50), allowNull: true },
      relatedEntityId: { type: Sequelize.BIGINT, allowNull: true },
      isRead: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      readAt: { type: Sequelize.DATE, allowNull: true },
      pushStatus: {
        type: Sequelize.ENUM("PENDING", "SENT", "FAILED", "SKIPPED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("notifications", ["idUser", "isRead"], {
      name: "notifications_user_isread_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notifications");
  },
};
