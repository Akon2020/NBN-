"use strict";

// GOAL 1 — cycle de vie des biens. L'ancien ENUM (DISPONIBLE/RESERVE/
// LOUE_VENDU) conflatait location et vente dans un même état terminal
// ("LOUE_VENDU"), déjà signalé comme incohérent lors de l'audit initial
// (SEC-G04/BACK-G05). Nouveau cycle de vie, cohérent avec `category` :
//   - DISPONIBLE            : biens RENT et SALE
//   - OCCUPE_CLIENT_NBN     : occupé par un client suivi dans le CRM NBN
//   - OCCUPE_CLIENT_EXTERNE : occupé par un tiers non suivi (ex. locataire
//                             déjà en place avant la prise en gestion NBN)
//   - EN_MAINTENANCE        : temporairement indisponible
//   - VENDU                 : uniquement pour category=SALE, état terminal
// "RESERVE" n'a pas d'équivalent direct au sens strict du cycle de vie du
// bien — le suivi d'un intérêt en cours (client "PROPOSE" côté Matching)
// reste au niveau du pipeline commercial, pas un état propre du bien.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "UPDATE properties SET statut = 'DISPONIBLE' WHERE statut = 'RESERVE'"
    );
    await queryInterface.sequelize.query(
      "UPDATE properties SET statut = 'VENDU' WHERE statut = 'LOUE_VENDU' AND category = 'SALE'"
    );
    await queryInterface.sequelize.query(
      "UPDATE properties SET statut = 'OCCUPE_CLIENT_NBN' WHERE statut = 'LOUE_VENDU' AND category = 'RENT'"
    );

    await queryInterface.changeColumn("properties", "statut", {
      type: Sequelize.ENUM(
        "DISPONIBLE",
        "OCCUPE_CLIENT_NBN",
        "OCCUPE_CLIENT_EXTERNE",
        "EN_MAINTENANCE",
        "VENDU"
      ),
      allowNull: false,
      defaultValue: "DISPONIBLE",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "UPDATE properties SET statut = 'LOUE_VENDU' WHERE statut IN ('OCCUPE_CLIENT_NBN', 'OCCUPE_CLIENT_EXTERNE', 'VENDU')"
    );
    await queryInterface.sequelize.query(
      "UPDATE properties SET statut = 'DISPONIBLE' WHERE statut = 'EN_MAINTENANCE'"
    );
    await queryInterface.changeColumn("properties", "statut", {
      type: Sequelize.ENUM("DISPONIBLE", "RESERVE", "LOUE_VENDU"),
      allowNull: false,
      defaultValue: "DISPONIBLE",
    });
  },
};
