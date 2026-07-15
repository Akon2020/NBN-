"use strict";

// BACK-G13 — catalogue RBAC pour le workflow de réquisition de fonds
// (info.md §6). "requisitions:create" est large (tout service qui peut
// avoir besoin de matériel/fonds) ; "requisitions:validate" reste réservé
// à la trésorerie, seule autorité d'approbation du circuit.
const NEW_PERMISSIONS = [
  { key: "requisitions:read", description: "Consulter toutes les réquisitions (audit)" },
  { key: "requisitions:create", description: "Soumettre une réquisition de fonds" },
  {
    key: "requisitions:validate",
    description: "Approuver, rejeter ou demander un complément sur une réquisition",
  },
];

const ROLE_PERMISSIONS = {
  tresorerie: ["requisitions:read", "requisitions:create", "requisitions:validate"],
  operations: ["requisitions:read", "requisitions:create"],
  communication: ["requisitions:create"],
  marketing: ["requisitions:create"],
  technologique: ["requisitions:create"],
  juridique: ["requisitions:create"],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [existing] = await queryInterface.sequelize.query(
      "SELECT `key` FROM permissions WHERE `key` = 'requisitions:read'"
    );
    if (existing.length) {
      return; // rejouable sans erreur.
    }

    await queryInterface.bulkInsert(
      "permissions",
      NEW_PERMISSIONS.map((p) => ({ ...p, createdAt: now, updatedAt: now }))
    );

    const [roles] = await queryInterface.sequelize.query("SELECT idRole, name FROM roles");
    const [permissions] = await queryInterface.sequelize.query(
      "SELECT idPermission, `key` FROM permissions"
    );
    const roleIdByName = Object.fromEntries(roles.map((r) => [r.name, r.idRole]));
    const permissionIdByKey = Object.fromEntries(permissions.map((p) => [p.key, p.idPermission]));

    const rows = [];
    for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
      for (const key of keys) {
        rows.push({
          idRole: roleIdByName[roleName],
          idPermission: permissionIdByKey[key],
          createdAt: now,
        });
      }
    }
    if (rows.length) {
      await queryInterface.bulkInsert("rolePermissions", rows);
    }
  },

  async down(queryInterface) {
    const keys = NEW_PERMISSIONS.map((p) => `'${p.key}'`).join(",");
    const [permissions] = await queryInterface.sequelize.query(
      `SELECT idPermission FROM permissions WHERE \`key\` IN (${keys})`
    );
    const ids = permissions.map((p) => p.idPermission);
    if (ids.length) {
      await queryInterface.bulkDelete("rolePermissions", { idPermission: ids });
    }
    for (const permission of NEW_PERMISSIONS) {
      await queryInterface.bulkDelete("permissions", { key: permission.key });
    }
  },
};
