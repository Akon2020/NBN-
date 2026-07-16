"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("taskAssignees", {
      idTaskAssignee: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idTask: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "tasks", key: "idTask" },
        onDelete: "CASCADE",
      },
      idUser: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("taskAssignees", ["idTask", "idUser"], {
      unique: true,
      name: "task_assignees_unique_task_user",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("taskAssignees");
  },
};
