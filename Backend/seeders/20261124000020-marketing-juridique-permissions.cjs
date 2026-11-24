"use strict";

// P1.9 : Marketing et Juridique accèdent à l'onglet Bailleurs (consultation
// seule par défaut, niveau à confirmer par l'agence), au Pipeline client /
// Demandes reçues (consultation) et gèrent les photos et vidéos des biens de
// la galerie (property:media:manage, sans pouvoir modifier le reste du bien).
const MEDIA_PERMISSION = {
  key: "property:media:manage",
  description: "Ajouter, réordonner et supprimer les photos et vidéos d'un bien",
};
const GRANTS = {
  marketing: ["bailleurs:read", "clients:read", MEDIA_PERMISSION.key],
  juridique: ["bailleurs:read", "clients:read", MEDIA_PERMISSION.key],
};

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    const now = new Date();
    const [existing] = await q.query("SELECT `key` FROM permissions WHERE `key` = ?", { replacements: [MEDIA_PERMISSION.key] });
    if (!existing.length) {
      await queryInterface.bulkInsert("permissions", [{ ...MEDIA_PERMISSION, createdAt: now, updatedAt: now }]);
    }
    for (const [role, keys] of Object.entries(GRANTS)) {
      await q.query(
        `INSERT IGNORE INTO rolePermissions (idRole, idPermission, createdAt)
         SELECT r.idRole, p.idPermission, :now FROM roles r, permissions p
         WHERE r.name = :role AND p.\`key\` IN (:keys)
           AND NOT EXISTS (SELECT 1 FROM rolePermissions rp WHERE rp.idRole = r.idRole AND rp.idPermission = p.idPermission)`,
        { replacements: { now, role, keys } }
      );
    }
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    // bailleurs:read de juridique et clients:read de marketing existaient déjà.
    await q.query(
      `DELETE rp FROM rolePermissions rp JOIN roles r ON r.idRole = rp.idRole JOIN permissions p ON p.idPermission = rp.idPermission
       WHERE (r.name = 'marketing' AND p.\`key\` IN ('bailleurs:read', 'property:media:manage'))
          OR (r.name = 'juridique' AND p.\`key\` IN ('clients:read', 'property:media:manage'))`
    );
    await queryInterface.bulkDelete("permissions", { key: MEDIA_PERMISSION.key });
  },
};
