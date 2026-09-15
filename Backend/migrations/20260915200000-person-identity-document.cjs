"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Pièce d'identité annexée à une personne (responsable d'un bien).
    // Le fichier vit hors du dossier public `uploads/` : seul le chemin
    // interne est stocké ici, jamais une URL servie statiquement.
    await queryInterface.addColumn("persons", "idDocumentPath", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("persons", "idDocumentMimeType", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("persons", "idDocumentUploadedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("persons", "idDocumentUploadedAt");
    await queryInterface.removeColumn("persons", "idDocumentMimeType");
    await queryInterface.removeColumn("persons", "idDocumentPath");
  },
};
