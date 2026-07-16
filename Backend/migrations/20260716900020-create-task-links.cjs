"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("taskPropertyLinks", {
      idTaskPropertyLink: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idTask: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "tasks", key: "idTask" },
        onDelete: "CASCADE",
      },
      idProperty: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "properties", key: "idProperty" },
        onDelete: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("taskPropertyLinks", ["idTask", "idProperty"], {
      unique: true,
      name: "task_property_links_unique",
    });

    await queryInterface.createTable("taskClientLinks", {
      idTaskClientLink: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idTask: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "tasks", key: "idTask" },
        onDelete: "CASCADE",
      },
      idClient: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "clients", key: "idClient" },
        onDelete: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("taskClientLinks", ["idTask", "idClient"], {
      unique: true,
      name: "task_client_links_unique",
    });

    await queryInterface.createTable("taskBailleurLinks", {
      idTaskBailleurLink: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idTask: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "tasks", key: "idTask" },
        onDelete: "CASCADE",
      },
      idBailleur: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "bailleurs", key: "idBailleur" },
        onDelete: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("taskBailleurLinks", ["idTask", "idBailleur"], {
      unique: true,
      name: "task_bailleur_links_unique",
    });

    await queryInterface.createTable("taskCommissionnaireLinks", {
      idTaskCommissionnaireLink: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idTask: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "tasks", key: "idTask" },
        onDelete: "CASCADE",
      },
      idCommissionnaire: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "commissionnaires", key: "idCommissionnaire" },
        onDelete: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.addIndex("taskCommissionnaireLinks", ["idTask", "idCommissionnaire"], {
      unique: true,
      name: "task_commissionnaire_links_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("taskCommissionnaireLinks");
    await queryInterface.dropTable("taskBailleurLinks");
    await queryInterface.dropTable("taskClientLinks");
    await queryInterface.dropTable("taskPropertyLinks");
  },
};
