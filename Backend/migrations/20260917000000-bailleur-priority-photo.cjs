"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Profil défini par l'agence pour chaque bailleur. Il ordonne la liste
    // (VIP d'abord) : un profil par défaut STANDARD, jamais vide.
    await queryInterface.addColumn("bailleurs", "priorite", {
      type: Sequelize.ENUM("VIP", "PREMIUM", "STANDARD", "INACTIF"),
      allowNull: false,
      defaultValue: "STANDARD",
    });
    // Photo du bailleur (chemin sous uploads/, compressée à l'envoi). Distincte
    // de la pièce d'identité, qui reste dans le dossier privé.
    await queryInterface.addColumn("bailleurs", "photo", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("bailleurs", "photo");
    await queryInterface.removeColumn("bailleurs", "priorite");
  },
};
