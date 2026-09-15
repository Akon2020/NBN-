"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // « Supprimer la fiche » = suppression logique (CLAUDE.md §4, soft
    // delete) : la demande disparaît des écrans mais reste dans les rapports,
    // avec qui l'a supprimée et pourquoi (commentaire obligatoire).
    await queryInterface.addColumn("rentalRequests", "deletedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("rentalRequests", "deletedBy", {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: "users", key: "idUser" },
    });
    await queryInterface.addColumn("rentalRequests", "deletionReason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("rentalRequests", "deletionReason");
    await queryInterface.removeColumn("rentalRequests", "deletedBy");
    await queryInterface.removeColumn("rentalRequests", "deletedAt");
  },
};
