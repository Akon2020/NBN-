"use strict";

// Audience des boîtes professionnelles réglable dans Paramètres. Valeur
// `{ <clé de boîte>: { roles, users } }` : une boîte absente garde l'audience
// déclarée sur le serveur (MAILBOX_<CLÉ>_ROLES / _USERS).
const KEY = "mailboxes.audiences";

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT idAppSetting FROM appSettings WHERE `key` = :key",
      { replacements: { key: KEY } },
    );
    if (rows.length) return;

    const now = new Date();
    await queryInterface.bulkInsert("appSettings", [
      {
        key: KEY,
        value: JSON.stringify({}),
        description: "Destinataires des messages de chaque boîte professionnelle (réglés par ses membres)",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("appSettings", { key: KEY });
  },
};
