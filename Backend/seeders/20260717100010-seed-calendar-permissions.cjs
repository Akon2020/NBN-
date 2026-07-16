"use strict";

// BACK-G19 — catalogue RBAC pour la vue calendrier agrégée.
const NEW_PERMISSIONS = [
  { key: "calendar:read", description: "Consulter la vue calendrier agrégée" },
  { key: "calendar:manage", description: "Créer/supprimer un rendez-vous ponctuel" },
];

const ROLE_PERMISSIONS = {
  operations: ["calendar:read", "calendar:manage"],
  communication: ["calendar:read", "calendar:manage"],
  marketing: ["calendar:read", "calendar:manage"],
  technologique: ["calendar:read", "calendar:manage"],
  juridique: ["calendar:read", "calendar:manage"],
  tresorerie: ["calendar:read", "calendar:manage"],
  commissionnaire: ["calendar:read"],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [existing] = await queryInterface.sequelize.query(
      "SELECT `key` FROM permissions WHERE `key` = 'calendar:read'"
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
