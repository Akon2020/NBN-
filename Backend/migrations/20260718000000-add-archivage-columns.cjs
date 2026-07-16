"use strict";

// BACK-G21 — Archivage formalisé (CLAUDE.md §11/§4), scope plan.md : biens,
// clients, réquisitions, missions terrain (jamais Bailleur/Commissionnaire).
// Trois concepts distincts, jamais confondus :
//   - `deletedAt`   : soft delete Sequelize (paranoid), réversible à court
//                     terme, invisible en usage normal (erreur de saisie).
//   - `archivedAt` / `archiveReason` : archivage métier, cycle de vie
//                     terminé mais toujours consultable (ex. bien vendu
//                     depuis longtemps, réquisition ancienne).
// La rétention légale (purge définitive) reste hors-scope (CLAUDE.md §16
// point 3) — aucune colonne de purge ajoutée ici.
const TABLES = ["properties", "clients", "requisitions", "missions"];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of TABLES) {
      await queryInterface.addColumn(table, "deletedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.addColumn(table, "archivedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.addColumn(table, "archiveReason", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    for (const table of TABLES) {
      await queryInterface.removeColumn(table, "archiveReason");
      await queryInterface.removeColumn(table, "archivedAt");
      await queryInterface.removeColumn(table, "deletedAt");
    }
  },
};
