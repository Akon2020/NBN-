"use strict";

// Décision de l'agence (2026-11-25) : Marketing et Juridique ne se
// contentent pas de consulter l'onglet Bailleurs, ils peuvent aussi ajouter
// et modifier un bailleur (bailleurs:manage). La pièce d'identité reste
// réservée à bailleurs:identity:read.
const ROLES = ["marketing", "juridique"];
const KEY = "bailleurs:manage";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO rolePermissions (idRole, idPermission, createdAt)
       SELECT r.idRole, p.idPermission, :now FROM roles r, permissions p
       WHERE r.name IN (:roles) AND p.\`key\` = :key
         AND NOT EXISTS (SELECT 1 FROM rolePermissions rp WHERE rp.idRole = r.idRole AND rp.idPermission = p.idPermission)`,
      { replacements: { now: new Date(), roles: ROLES, key: KEY } }
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE rp FROM rolePermissions rp JOIN roles r ON r.idRole = rp.idRole JOIN permissions p ON p.idPermission = rp.idPermission
       WHERE r.name IN (:roles) AND p.\`key\` = :key`,
      { replacements: { roles: ROLES, key: KEY } }
    );
  },
};
