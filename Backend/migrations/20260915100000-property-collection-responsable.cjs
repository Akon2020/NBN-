"use strict";

const EXISTING_BAILLEUR_TYPES = ["PROPRIETAIRE", "MANDATAIRE"];

// Mêmes valeurs que rentalRequests.modalitePaiement (shared/paymentTerms.js).
const MODALITES_PAIEMENT = [
  "AVANCE_1_GARANTIE_3",
  "MENSUEL",
  "AVANCE_2_GARANTIE_3",
  "AVANCE_3_GARANTIE_2",
  "AVANCE_3_GARANTIE_3",
  "GARANTIE_6",
  "AUTRE",
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Le « responsable » d'un bien n'est pas toujours son propriétaire :
    // l'agence traite aussi avec des gérants et des sociétés/établissements.
    await queryInterface.changeColumn("bailleurs", "type", {
      type: Sequelize.ENUM(...EXISTING_BAILLEUR_TYPES, "GERANT", "SOCIETE"),
      allowNull: false,
    });

    // Prix plancher que le responsable accepterait si un client intéressé
    // négocie. Donnée de négociation : filtrée en sérialisation
    // (property:prix_minimum:read), jamais montrée à un client.
    await queryInterface.addColumn("properties", "prixMinimum", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("properties", "modalitePaiement", {
      type: Sequelize.ENUM(...MODALITES_PAIEMENT),
      allowNull: true,
    });
    await queryInterface.addColumn("properties", "modalitePaiementAutre", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("properties", "modalitePaiementAutre");
    await queryInterface.removeColumn("properties", "modalitePaiement");
    await queryInterface.removeColumn("properties", "prixMinimum");

    // Un gérant ou une société redevient mandataire : c'est le type existant
    // le plus proche (il agit pour le compte du propriétaire).
    await queryInterface.sequelize.query(
      "UPDATE bailleurs SET type = 'MANDATAIRE' WHERE type IN ('GERANT', 'SOCIETE')"
    );
    await queryInterface.changeColumn("bailleurs", "type", {
      type: Sequelize.ENUM(...EXISTING_BAILLEUR_TYPES),
      allowNull: false,
    });
  },
};
