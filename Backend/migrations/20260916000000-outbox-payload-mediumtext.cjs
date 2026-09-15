"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Un e-mail mis en file peut porter une pièce jointe (fiche PDF d'une
    // demande assignée, encodée en base64) : TEXT plafonne à 64 Ko, MEDIUMTEXT
    // à 16 Mo.
    await queryInterface.changeColumn("outboxEvents", "payload", {
      type: Sequelize.TEXT("medium"),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("outboxEvents", "payload", {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },
};
