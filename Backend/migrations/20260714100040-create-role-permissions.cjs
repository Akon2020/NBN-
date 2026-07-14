"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("rolePermissions", {
      idRolePermission: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      idRole: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "roles", key: "idRole" },
        onDelete: "CASCADE",
      },
      idPermission: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "permissions", key: "idPermission" },
        onDelete: "CASCADE",
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
    await queryInterface.addConstraint("rolePermissions", {
      fields: ["idRole", "idPermission"],
      type: "unique",
      name: "role_permissions_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("rolePermissions");
  },
};
