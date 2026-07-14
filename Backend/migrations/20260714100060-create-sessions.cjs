"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sessions", {
      idSession: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      idUser: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
        onDelete: "CASCADE",
      },
      refreshTokenHash: {
        // sha256 du refresh token — jamais le token en clair.
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      tokenFamilyId: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      replacedBySessionId: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "sessions", key: "idSession" },
      },
      platform: {
        type: Sequelize.ENUM("web", "ios", "android"),
        allowNull: false,
        defaultValue: "web",
      },
      deviceLabel: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      lastActiveAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      revokedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      revokedReason: {
        type: Sequelize.ENUM(
          "logout",
          "logout_all",
          "admin_revoke",
          "reuse_detected",
          "account_suspended",
          "expired"
        ),
        allowNull: true,
      },
    });
    await queryInterface.addIndex("sessions", ["refreshTokenHash"]);
    await queryInterface.addIndex("sessions", ["tokenFamilyId"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("sessions");
  },
};
