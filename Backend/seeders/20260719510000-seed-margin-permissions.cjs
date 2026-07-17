"use strict";

// GOAL 9 — écrire/overrider une marge est distinct de la lire
// (`property:margin:read`, déjà en place) : même granularité read/manage
// que le reste du catalogue RBAC (ex. hr:read/hr:manage).
const NEW_PERMISSIONS = [
  {
    key: "property:margin:manage",
    description: "Configurer les pourcentages de marge par défaut et les overrides par bien",
  },
];

const ROLE_PERMISSIONS = {
  tresorerie: ["property:margin:manage"],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [existing] = await queryInterface.sequelize.query(
      "SELECT `key` FROM permissions WHERE `key` = 'property:margin:manage'"
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
