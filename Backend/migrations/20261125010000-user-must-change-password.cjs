"use strict";

// Un compte créé par l'administration, ou dont le mot de passe a été
// réinitialisé par un administrateur, doit choisir son propre mot de passe à
// la connexion suivante : le mot de passe transmis par l'admin ne sert
// qu'une fois.
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("users");
    if (!table.mustChangePassword) {
      await queryInterface.addColumn("users", "mustChangePassword", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "mustChangePassword");
  },
};
