"use strict";

// BACK-G07 — remplace les champs clientName/clientPhone jamais activés
// (commentés dans le modèle) par un vrai lien vers un Client.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("proposals", "idClient", {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: "clients", key: "idClient" },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("proposals", "idClient");
  },
};
