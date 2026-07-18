"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // GOAL 14 — la timeline générique (GOAL 3) couvrait déjà PROPERTY/
    // CLIENT/COMMISSIONNAIRE/BAILLEUR ; une mission a besoin de son propre
    // historique consultable en un seul endroit (création, transitions,
    // archivage), en plus des événements déjà journalisés côté
    // bien/client/commissionnaire concernés.
    await queryInterface.changeColumn("timelineEvents", "entityType", {
      type: Sequelize.ENUM("PROPERTY", "CLIENT", "COMMISSIONNAIRE", "BAILLEUR", "MISSION"),
      allowNull: false,
    });

    // GOAL 14 — progression déclarée par le commissionnaire assigné,
    // distincte du statut de validation administrative (SOUMISE/VALIDEE/
    // REJETEE/CORRECTION_DEMANDEE) : une mission validée pour être
    // exécutée peut être 0% à 100% avancée sur le terrain avant d'être
    // classée comme un résultat définitif.
    await queryInterface.addColumn("missions", "progression", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("missions", "progression");
    await queryInterface.changeColumn("timelineEvents", "entityType", {
      type: Sequelize.ENUM("PROPERTY", "CLIENT", "COMMISSIONNAIRE", "BAILLEUR"),
      allowNull: false,
    });
  },
};
