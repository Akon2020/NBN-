"use strict";

// CDC §3 module Bailleur : "Biens associés ... lien direct avec le module
// biens" — un bien peut avoir été fourni par un bailleur.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("properties", "idBailleur", {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: "bailleurs", key: "idBailleur" },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("properties", "idBailleur");
  },
};
