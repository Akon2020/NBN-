"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Code du collecteur (CTR) qui a relevé le bien, à côté du code du
    // commissionnaire (CMR) qui l'a apporté.
    await queryInterface.addColumn("properties", "codeCollecteur", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("properties", "codeCollecteur");
  },
};
