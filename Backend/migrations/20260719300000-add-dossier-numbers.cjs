"use strict";

/** @type {import('sequelize-cli').Migration} */
// GOAL 6 — numéro de dossier unique et lisible pour clients et bailleurs
// (commissionnaires ont déjà `code`, les réquisitions ont déjà
// `validationCode` — ces deux entités ne sont donc pas concernées ici).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("clients", "dossierNumber", {
      type: Sequelize.STRING(30),
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn("bailleurs", "dossierNumber", {
      type: Sequelize.STRING(30),
      allowNull: true,
      unique: true,
    });

    // Rétro-remplissage des lignes existantes (base de dev jetable,
    // CLAUDE.md §2.10, mais on évite quand même de laisser des NULL
    // incohérents sur des données déjà présentes).
    const [clients] = await queryInterface.sequelize.query(
      "SELECT idClient, createdAt FROM clients WHERE dossierNumber IS NULL"
    );
    for (const client of clients) {
      const year = new Date(client.createdAt).getFullYear();
      const dossierNumber = `CLI-${year}-${String(client.idClient).padStart(6, "0")}`;
      await queryInterface.sequelize.query(
        "UPDATE clients SET dossierNumber = ? WHERE idClient = ?",
        { replacements: [dossierNumber, client.idClient] }
      );
    }

    const [bailleurs] = await queryInterface.sequelize.query(
      "SELECT idBailleur, createdAt FROM bailleurs WHERE dossierNumber IS NULL"
    );
    for (const bailleur of bailleurs) {
      const year = new Date(bailleur.createdAt).getFullYear();
      const dossierNumber = `BAI-${year}-${String(bailleur.idBailleur).padStart(6, "0")}`;
      await queryInterface.sequelize.query(
        "UPDATE bailleurs SET dossierNumber = ? WHERE idBailleur = ?",
        { replacements: [dossierNumber, bailleur.idBailleur] }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("clients", "dossierNumber");
    await queryInterface.removeColumn("bailleurs", "dossierNumber");
  },
};
