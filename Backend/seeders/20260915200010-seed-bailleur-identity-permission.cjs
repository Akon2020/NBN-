"use strict";

// Consultation de la pièce d'identité d'un bailleur. Donnée personnelle
// sensible : l'admin y a accès par construction (utils/rbac.js), aucun rôle
// ne la reçoit par défaut. Elle existe au catalogue pour pouvoir être
// accordée explicitement (rôle ou AccessGrant) quand l'agence le décide.
const PERMISSION = {
  key: "bailleurs:identity:read",
  description: "Consulter la pièce d'identité annexée à la fiche d'un bailleur",
};

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT `key` FROM permissions WHERE `key` = ?",
      { replacements: [PERMISSION.key] }
    );
    if (existing.length) return;

    const now = new Date();
    await queryInterface.bulkInsert("permissions", [
      { ...PERMISSION, createdAt: now, updatedAt: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("permissions", { key: PERMISSION.key });
  },
};
