"use strict";

// BACK-G17 — catalogue RBAC pour les alertes. Notifications et Reminders
// sont scopés à l'utilisateur connecté (pas de liste globale), donc pas
// de permission RBAC dédiée au-delà de l'authentification.
const NEW_PERMISSIONS = [
  { key: "alerts:read", description: "Consulter les alertes" },
  {
    key: "alerts:manage",
    description: "Créer, assigner et faire évoluer le statut d'une alerte",
  },
];

const ROLE_PERMISSIONS = {
  operations: ["alerts:read", "alerts:manage"],
  technologique: ["alerts:read", "alerts:manage"],
  tresorerie: ["alerts:read", "alerts:manage"],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [existing] = await queryInterface.sequelize.query(
      "SELECT `key` FROM permissions WHERE `key` = 'alerts:read'"
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
