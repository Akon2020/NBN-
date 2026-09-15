"use strict";

const EXISTING_MODALITES = [
  "MENSUEL",
  "AVANCE_2_GARANTIE_3",
  "AVANCE_3_GARANTIE_2",
  "AVANCE_3_GARANTIE_3",
  "GARANTIE_6",
  "AUTRE",
];

// « 1 mois d'avance + 3 mois de garantie » : modalité réellement pratiquée,
// commune à la demande de location et à la collecte de bien.
const ALL_MODALITES = ["AVANCE_1_GARANTIE_3", ...EXISTING_MODALITES];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // L'adresse du client sert à l'accusé de réception et au bouton
    // « Contacter » de la fiche — elle devient obligatoire dans le
    // formulaire, mais reste nullable ici pour les demandes déjà reçues.
    await queryInterface.addColumn("rentalRequests", "email", {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
    await queryInterface.addColumn("rentalRequests", "budgetMin", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("rentalRequests", "typeOccupants", {
      type: Sequelize.ENUM("FAMILLE_NOMBREUSE", "FAMILLE_PEU_NOMBREUSE", "COUPLE", "AUTRE"),
      allowNull: true,
    });
    await queryInterface.changeColumn("rentalRequests", "modalitePaiement", {
      type: Sequelize.ENUM(...ALL_MODALITES),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "UPDATE rentalRequests SET modalitePaiement = 'AUTRE' WHERE modalitePaiement = 'AVANCE_1_GARANTIE_3'"
    );
    await queryInterface.changeColumn("rentalRequests", "modalitePaiement", {
      type: Sequelize.ENUM(...EXISTING_MODALITES),
      allowNull: true,
    });
    await queryInterface.removeColumn("rentalRequests", "typeOccupants");
    await queryInterface.removeColumn("rentalRequests", "budgetMin");
    await queryInterface.removeColumn("rentalRequests", "email");
  },
};
