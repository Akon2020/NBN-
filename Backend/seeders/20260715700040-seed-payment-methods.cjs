"use strict";

// CLAUDE.md §4 — Payment découplé de PaymentMethod (espèces/virement/
// Mobile Money, catalogue V1 explicite du cahier des charges).
const METHODS = [
  { code: "CASH", label: "Espèces" },
  { code: "VIREMENT", label: "Virement bancaire" },
  { code: "MOBILE_MONEY", label: "Mobile Money" },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const [existing] = await queryInterface.sequelize.query(
      "SELECT code FROM paymentMethods WHERE code = 'CASH'"
    );
    if (existing.length) {
      return; // rejouable sans erreur.
    }

    await queryInterface.bulkInsert(
      "paymentMethods",
      METHODS.map((m) => ({ ...m, isActive: true, createdAt: now, updatedAt: now }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("paymentMethods", {
      code: METHODS.map((m) => m.code),
    });
  },
};
