"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Jetons à usage unique envoyés par e-mail ou WhatsApp :
    // réinitialisation du mot de passe, clé d'accès d'un commissionnaire,
    // définition du mot de passe à la première connexion. Seul le hachage
    // est stocké ; un nouveau jeton révoque les précédents du même usage.
    await queryInterface.createTable("authTokens", {
      idAuthToken: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idUser: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "users", key: "idUser" },
        onDelete: "CASCADE",
      },
      purpose: {
        type: Sequelize.ENUM("PASSWORD_RESET", "ACCESS_KEY", "PASSWORD_SETUP"),
        allowNull: false,
      },
      tokenHash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      usedAt: { type: Sequelize.DATE, allowNull: true },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
        onDelete: "SET NULL",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("authTokens", ["idUser", "purpose"], { name: "auth_tokens_user_purpose" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("authTokens");
  },
};
