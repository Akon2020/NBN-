"use strict";

// Espace commissionnaire (P1.2) : il ne voit que ses propres données. La
// permission commissionnaires:read lui donnait la liste de toutes les fiches
// avec leur notation ; sa propre fiche passe désormais par /me et
// /api/field-agent (règle contextuelle, sans permission).
const ROLE = "commissionnaire";
const REMOVED = ["commissionnaires:read"];

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE rp FROM rolePermissions rp
       JOIN roles r ON r.idRole = rp.idRole
       JOIN permissions p ON p.idPermission = rp.idPermission
       WHERE r.name = ? AND p.\`key\` IN (?)`,
      { replacements: [ROLE, REMOVED] }
    );
  },

  async down(queryInterface) {
    const [[role]] = await queryInterface.sequelize.query("SELECT idRole FROM roles WHERE name = ?", { replacements: [ROLE] });
    if (!role) return;
    const [permissions] = await queryInterface.sequelize.query("SELECT idPermission FROM permissions WHERE `key` IN (?)", {
      replacements: [REMOVED],
    });
    const now = new Date();
    for (const permission of permissions) {
      await queryInterface.sequelize.query(
        "INSERT IGNORE INTO rolePermissions (idRole, idPermission, createdAt) VALUES (?, ?, ?)",
        { replacements: [role.idRole, permission.idPermission, now] }
      );
    }
  },
};
