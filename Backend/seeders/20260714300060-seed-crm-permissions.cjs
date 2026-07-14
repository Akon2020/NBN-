"use strict";

// BACK-G06 — étend le catalogue RBAC (seedé en M1) avec les permissions
// CRM Client/Bailleur, sans toucher au seeder de base (déjà appliqué, donc
// idempotent-skip). Idempotent sur sa propre clé de permission.
const NEW_PERMISSIONS = [
  { key: "clients:read", description: "Consulter les fiches client" },
  {
    key: "clients:manage",
    description: "Créer, modifier des fiches client (pipeline, relances)",
  },
  { key: "bailleurs:read", description: "Consulter les fiches bailleur" },
  { key: "bailleurs:manage", description: "Créer, modifier des fiches bailleur" },
  {
    key: "bailleur:marge:read",
    description: "Voir la marge agence d'un bailleur (champ sensible)",
  },
];

// CDC §3 : opérations gère clients+biens+matching ; marketing qualifie les
// prospects ; juridique vérifie l'identité des bailleurs ; trésorerie
// suit les flux financiers (marge) ; commissionnaires apportent des
// clients depuis le terrain.
const ROLE_PERMISSIONS = {
  operations: ["clients:read", "clients:manage", "bailleurs:read", "bailleurs:manage"],
  marketing: ["clients:read", "clients:manage"],
  juridique: ["bailleurs:read"],
  tresorerie: ["bailleurs:read", "bailleur:marge:read"],
  commissionnaire: ["clients:manage"],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [existing] = await queryInterface.sequelize.query(
      "SELECT `key` FROM permissions WHERE `key` = 'clients:read'"
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
