"use strict";

// BACK-G02 : le rôle passe d'un ENUM figé à une simple chaîne validée en
// application contre le catalogue `roles` (table statique mais extensible
// sans migration de schéma à chaque nouveau rôle).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("users", "role", {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "agent",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("users", "role", {
      type: Sequelize.ENUM("admin", "agent", "consultant"),
      defaultValue: "agent",
    });
  },
};
