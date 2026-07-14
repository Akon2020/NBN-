"use strict";

// BACK-G02 — Catalogue RBAC initial (CLAUDE.md §5 et §3 du cahier des
// charges). "admin" a un accès total géré en application (voir
// utils/rbac.js), pas via des lignes RolePermission à maintenir.
// "consultant" naît volontairement sans aucune permission de base — tout
// son accès passe par AccessGrant.
const ROLES = [
  { name: "admin", label: "Administrateur" },
  { name: "communication", label: "Communication" },
  { name: "marketing", label: "Marketing" },
  { name: "operations", label: "Opérations" },
  { name: "technologique", label: "Technologique" },
  { name: "juridique", label: "Juridique" },
  { name: "tresorerie", label: "Trésorerie" },
  { name: "commissionnaire", label: "Commissionnaire" },
  { name: "consultant", label: "Consultant" },
];

const PERMISSIONS = [
  { key: "users:read", description: "Consulter la liste des utilisateurs" },
  {
    key: "users:manage",
    description: "Créer, modifier, supprimer des utilisateurs",
  },
  {
    key: "property:margin:read",
    description: "Voir la marge interne d'un bien (champ sensible)",
  },
  {
    key: "roles:manage",
    description: "Gérer le catalogue de rôles/permissions et les AccessGrant",
  },
];

// Le service Technologique gère les utilisateurs et les rôles (CDC §3,
// module Gestion des utilisateurs) ; la Trésorerie voit les marges
// (donnée financière). Les autres services opérationnels n'ont aucune de
// ces permissions par défaut.
const ROLE_PERMISSIONS = {
  technologique: ["users:read", "users:manage", "roles:manage"],
  tresorerie: ["property:margin:read"],
};

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT idRole FROM roles LIMIT 1"
    );
    if (existing.length) {
      return; // db:seed:all doit rester rejouable sans erreur.
    }

    const now = new Date();

    await queryInterface.bulkInsert(
      "roles",
      ROLES.map((role) => ({ ...role, createdAt: now, updatedAt: now }))
    );
    await queryInterface.bulkInsert(
      "permissions",
      PERMISSIONS.map((permission) => ({
        ...permission,
        createdAt: now,
        updatedAt: now,
      }))
    );

    const [insertedRoles] = await queryInterface.sequelize.query(
      "SELECT idRole, name FROM roles"
    );
    const [insertedPermissions] = await queryInterface.sequelize.query(
      "SELECT idPermission, `key` FROM permissions"
    );

    const roleIdByName = Object.fromEntries(
      insertedRoles.map((r) => [r.name, r.idRole])
    );
    const permissionIdByKey = Object.fromEntries(
      insertedPermissions.map((p) => [p.key, p.idPermission])
    );

    const rolePermissionRows = [];
    for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
      for (const key of permissionKeys) {
        rolePermissionRows.push({
          idRole: roleIdByName[roleName],
          idPermission: permissionIdByKey[key],
          createdAt: now,
        });
      }
    }

    if (rolePermissionRows.length) {
      await queryInterface.bulkInsert("rolePermissions", rolePermissionRows);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("rolePermissions", null);
    await queryInterface.bulkDelete("permissions", null);
    await queryInterface.bulkDelete("roles", null);
  },
};
