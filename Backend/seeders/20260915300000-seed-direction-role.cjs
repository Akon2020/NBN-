"use strict";

// Rôle « direction » : compte de la direction de l'agence, destinataire
// exclusif des messages reçus sur direction@nbnexpress.org. Aucune
// permission métier par défaut — son accès aux écrans se décide ensuite,
// comme pour tout rôle, via le catalogue RBAC.
const ROLE = { name: "direction", label: "Direction" };

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT idRole FROM roles WHERE name = ?",
      { replacements: [ROLE.name] }
    );
    if (existing.length) return;

    const now = new Date();
    await queryInterface.bulkInsert("roles", [{ ...ROLE, createdAt: now, updatedAt: now }]);
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query("SELECT idRole FROM roles WHERE name = ?", {
      replacements: [ROLE.name],
    });
    if (rows.length) {
      await queryInterface.bulkDelete("rolePermissions", { idRole: rows[0].idRole });
    }
    await queryInterface.bulkDelete("roles", { name: ROLE.name });
  },
};
