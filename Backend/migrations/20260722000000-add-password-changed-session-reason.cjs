"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // GOAL 16 — un changement de mot de passe (self-service) révoque
    // désormais toutes les sessions actives (CLAUDE.md §5, même double
    // mécanisme que la suspension) : mérite sa propre raison d'audit,
    // distincte de "logout_all" (déconnexion volontaire multi-appareils)
    // et de "account_suspended".
    await queryInterface.changeColumn("sessions", "revokedReason", {
      type: Sequelize.ENUM(
        "logout",
        "logout_all",
        "admin_revoke",
        "reuse_detected",
        "account_suspended",
        "password_changed",
        "expired"
      ),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("sessions", "revokedReason", {
      type: Sequelize.ENUM(
        "logout",
        "logout_all",
        "admin_revoke",
        "reuse_detected",
        "account_suspended",
        "expired"
      ),
      allowNull: true,
    });
  },
};
