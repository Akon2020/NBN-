"use strict";

// BACK-G04 — catalogue des services organisationnels (CLAUDE.md §3 / CDC).
const SERVICES = [
  "Communication",
  "Commercial",
  "Marketing",
  "Opérations",
  "Technologique",
  "Juridique",
  "Trésorerie",
  "Secrétariat",
  "Commissionnaires",
];

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT idService FROM services LIMIT 1"
    );
    if (existing.length) {
      return; // db:seed:all doit rester rejouable sans erreur.
    }

    const now = new Date();
    await queryInterface.bulkInsert(
      "services",
      SERVICES.map((name) => ({ name, createdAt: now, updatedAt: now }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("services", null);
  },
};
