"use strict";

// GOAL 13 — valeurs de départ raisonnables, toutes reconfigurables ensuite
// via l'API ; aucune n'est présentée comme une obligation légale ou un
// choix définitif (CLAUDE.md §11/§13 : toute valeur métier est une
// variable de configuration, jamais une constante figée dans le code).
const SEED_SETTINGS = [
  {
    key: "cart.maxItems",
    value: JSON.stringify(10),
    description: "Nombre maximum de biens dans le panier WhatsApp",
  },
  {
    key: "company.info",
    value: JSON.stringify({
      name: "Nyumbani Express",
      phone: "+243 999 000 111",
      address: "Avenue de la Paix, Bukavu, Sud-Kivu, RDC",
      email: "contact@nyumbani.cd",
    }),
    description: "Coordonnées de l'agence utilisées dans les propositions clients",
  },
  {
    key: "commissionnaire.scoringEnabled",
    value: JSON.stringify(true),
    description: "Active l'impact automatique des incidents sur le score discipline",
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("appSettings", {
      idAppSetting: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      key: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      value: { type: Sequelize.TEXT, allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      updatedBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    const now = new Date();
    await queryInterface.bulkInsert(
      "appSettings",
      SEED_SETTINGS.map((s) => ({ ...s, createdAt: now, updatedAt: now }))
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("appSettings");
  },
};
