"use strict";

// Prix minimum acceptable d'un bien : visible par l'administration
// uniquement. L'admin a déjà toutes les permissions par construction
// (utils/rbac.js) — aucun rôle ne la reçoit ici. Elle existe au catalogue
// pour pouvoir être accordée ponctuellement via un AccessGrant.
const PERMISSION = {
  key: "property:prix_minimum:read",
  description: "Voir le prix minimum acceptable fixé par le responsable d'un bien",
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
