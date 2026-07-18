"use strict";

// GOAL 13 — centre de configuration transverse (panier, coordonnées de
// l'agence, interrupteurs métier). Lecture largement ouverte (tout le
// personnel interne peut voir la configuration active, ex. le panier
// WhatsApp qui les concerne tous) ; écriture réservée à l'administration
// système, même granularité read/manage que le reste du catalogue.
const NEW_PERMISSIONS = [
  { key: "settings:read", description: "Consulter les paramètres de configuration" },
  { key: "settings:manage", description: "Modifier les paramètres de configuration" },
];

const ROLE_PERMISSIONS = {
  communication: ["settings:read"],
  marketing: ["settings:read"],
  operations: ["settings:read"],
  technologique: ["settings:read", "settings:manage"],
  juridique: ["settings:read"],
  tresorerie: ["settings:read"],
  commissionnaire: ["settings:read"],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [existing] = await queryInterface.sequelize.query(
      "SELECT `key` FROM permissions WHERE `key` = 'settings:read'"
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
