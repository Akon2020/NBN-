"use strict";

// BACK-G05 — complète Property : statut réel (corrige définitivement
// SEC-G04, qui avait dû retirer le filtre sur un champ `statut`
// inexistant), source terrain (CDC §4), et assignedTo préparé mais inerte
// (CLAUDE.md §5, cloisonnement par agent/zone hors périmètre V1).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("properties", "statut", {
      type: Sequelize.ENUM("DISPONIBLE", "RESERVE", "LOUE_VENDU"),
      allowNull: false,
      defaultValue: "DISPONIBLE",
    });
    await queryInterface.addColumn("properties", "codeCommissionnaire", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn("properties", "informateur", {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
    await queryInterface.addColumn("properties", "assignedTo", {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: { model: "users", key: "idUser" },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("properties", "statut");
    await queryInterface.removeColumn("properties", "codeCommissionnaire");
    await queryInterface.removeColumn("properties", "informateur");
    await queryInterface.removeColumn("properties", "assignedTo");
  },
};
