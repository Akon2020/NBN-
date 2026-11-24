"use strict";

// Consultation et remplacement de la pièce d'identité d'un commissionnaire
// ou d'un collecteur. Donnée personnelle sensible : admin par construction
// (utils/rbac.js), accordable à un rôle ou par AccessGrant si l'agence le
// décide.
const PERMISSION = {
  key: "commissionnaires:identity:read",
  description: "Consulter et remplacer la pièce d'identité d'un commissionnaire ou d'un collecteur",
};

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query("SELECT `key` FROM permissions WHERE `key` = ?", {
      replacements: [PERMISSION.key],
    });
    if (existing.length) return;
    const now = new Date();
    await queryInterface.bulkInsert("permissions", [{ ...PERMISSION, createdAt: now, updatedAt: now }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("permissions", { key: PERMISSION.key });
  },
};
