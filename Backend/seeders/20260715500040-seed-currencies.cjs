"use strict";

// CLAUDE.md §4 — USD et CDF pré-remplies, table extensible sans migration
// (une nouvelle devise s'ajoute par une simple ligne, pas un déploiement).
const CURRENCIES = [
  { code: "USD", label: "Dollar américain", symbol: "$" },
  { code: "CDF", label: "Franc congolais", symbol: "FC" },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const [existing] = await queryInterface.sequelize.query(
      "SELECT code FROM currencies WHERE code = 'USD'"
    );
    if (existing.length) {
      return; // rejouable sans erreur.
    }

    await queryInterface.bulkInsert(
      "currencies",
      CURRENCIES.map((c) => ({ ...c, isActive: true, createdAt: now, updatedAt: now }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("currencies", {
      code: CURRENCIES.map((c) => c.code),
    });
  },
};
