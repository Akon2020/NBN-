"use strict";

// Paramètres modifiables par l'administration, sans toucher au code :
// - modèle de l'accusé de réception envoyé au client (P1.8) ;
// - règle de calcul de la commission d'un commissionnaire (P1.2, à
//   confirmer par l'agence : « MANUEL » tant qu'elle n'est pas choisie).
const SETTINGS = [
  {
    key: "emails.rentalRequestAcknowledgement",
    description: "Accusé de réception envoyé au client après une demande de location",
    value: {
      subject: "Avis de réception de votre demande [N° de demande]",
      body: [
        "Bonjour [Civilité] [Prénom du client],",
        "",
        "Nous vous confirmons que votre demande a bien été reçue par NBN Express le [Date de la demande].",
        "",
        "Les informations concernant votre recherche de bien immobilier ont été enregistrées avec succès. Notre équipe va examiner votre demande et un agent NBN Express vous contactera bientôt pour la suite de votre recherche.",
        "",
        "Merci d'avoir choisi NBN Express",
        "La crédibilité au service de votre projet immobilier.",
        "",
        "L'équipe NBN Express",
      ].join("\n"),
    },
  },
  {
    key: "commissions.commissionnaireRule",
    description: "Calcul de la commission d'un commissionnaire sur une transaction conclue",
    value: { mode: "MANUEL", valeur: null, parType: {} },
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    for (const setting of SETTINGS) {
      const [rows] = await queryInterface.sequelize.query("SELECT idAppSetting FROM appSettings WHERE `key` = :key", {
        replacements: { key: setting.key },
      });
      if (rows.length) continue;
      await queryInterface.bulkInsert("appSettings", [
        {
          key: setting.key,
          value: JSON.stringify(setting.value),
          description: setting.description,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("appSettings", { key: SETTINGS.map((s) => s.key) });
  },
};
