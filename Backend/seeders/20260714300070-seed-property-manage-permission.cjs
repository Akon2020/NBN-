"use strict";

// BACK-G07 — permission de gestion des biens (création/édition/suppression),
// distincte de la simple consultation qui reste ouverte à tout utilisateur
// authentifié (cf. property.route.js).
const PERMISSION = {
  key: "property:manage",
  description: "Créer, modifier, supprimer des biens immobiliers",
};

const ROLES_WITH_ACCESS = ["operations", "commissionnaire"];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [existing] = await queryInterface.sequelize.query(
      "SELECT `key` FROM permissions WHERE `key` = ?",
      { replacements: [PERMISSION.key] }
    );
    if (existing.length) {
      return;
    }

    await queryInterface.bulkInsert("permissions", [
      { ...PERMISSION, createdAt: now, updatedAt: now },
    ]);

    const [permissionRows] = await queryInterface.sequelize.query(
      "SELECT idPermission FROM permissions WHERE `key` = ?",
      { replacements: [PERMISSION.key] }
    );
    const idPermission = permissionRows[0].idPermission;

    const [roles] = await queryInterface.sequelize.query(
      `SELECT idRole FROM roles WHERE name IN (${ROLES_WITH_ACCESS.map(() => "?").join(",")})`,
      { replacements: ROLES_WITH_ACCESS }
    );

    if (roles.length) {
      await queryInterface.bulkInsert(
        "rolePermissions",
        roles.map((role) => ({ idRole: role.idRole, idPermission, createdAt: now }))
      );
    }
  },

  async down(queryInterface) {
    const [permissionRows] = await queryInterface.sequelize.query(
      "SELECT idPermission FROM permissions WHERE `key` = ?",
      { replacements: [PERMISSION.key] }
    );
    if (permissionRows.length) {
      await queryInterface.bulkDelete("rolePermissions", {
        idPermission: permissionRows[0].idPermission,
      });
    }
    await queryInterface.bulkDelete("permissions", { key: PERMISSION.key });
  },
};
