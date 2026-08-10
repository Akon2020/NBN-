"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Formulaire public de demande de location — enregistrement intégral et
    // immuable de ce que le client a réellement déclaré (y compris
    // l'acceptation des conditions, qui a une valeur d'engagement).
    // Distinct de `clients` : le Client est l'entité CRM vivante qui avance
    // sur le pipeline commercial, la RentalRequest est la trace figée de la
    // demande d'origine — jamais l'un écrasé par l'autre.
    await queryInterface.createTable("rentalRequests", {
      idRentalRequest: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },

      // A. Identification client
      fullName: { type: Sequelize.STRING(150), allowNull: false },
      phone: { type: Sequelize.STRING(30), allowNull: false },
      lieuProvenance: { type: Sequelize.STRING(150), allowNull: true },
      residenceActuelle: { type: Sequelize.STRING(150), allowNull: true },
      sexe: { type: Sequelize.ENUM("MASCULIN", "FEMININ"), allowNull: true },
      typeClient: {
        type: Sequelize.ENUM("PARTICULIER", "PROFESSIONNEL", "ENTREPRISE", "EXPATRIE"),
        allowNull: true,
      },
      canalContact: {
        type: Sequelize.ENUM("TERRAIN", "APPEL", "WHATSAPP", "RESEAU", "AUTRE"),
        allowNull: true,
      },
      canalContactAutre: { type: Sequelize.STRING(150), allowNull: true },

      // B. Type de location recherchée
      typesBien: { type: Sequelize.JSON, allowNull: true },
      typeBienAutre: { type: Sequelize.STRING(150), allowNull: true },
      usageBien: {
        type: Sequelize.ENUM("HABITATION", "BUREAU", "COMMERCIAL", "MIXTE"),
        allowNull: true,
      },

      // C. Milieu préférentiel
      ville: { type: Sequelize.ENUM("BUKAVU", "AUTRE"), allowNull: true },
      villeAutre: { type: Sequelize.STRING(150), allowNull: true },
      commune: { type: Sequelize.ENUM("IBANDA", "KADUTU", "BAGIRA"), allowNull: true },
      quartier: { type: Sequelize.STRING(150), allowNull: true },
      avenues: { type: Sequelize.TEXT, allowNull: true },

      // D. Budget & conditions financières
      loyerMax: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      devise: { type: Sequelize.ENUM("USD", "CDF"), allowNull: false, defaultValue: "USD" },
      modalitePaiement: {
        type: Sequelize.ENUM(
          "MENSUEL",
          "AVANCE_2_GARANTIE_3",
          "AVANCE_3_GARANTIE_2",
          "AVANCE_3_GARANTIE_3",
          "GARANTIE_6",
          "AUTRE"
        ),
        allowNull: true,
      },
      modalitePaiementAutre: { type: Sequelize.STRING(255), allowNull: true },
      chargesIncluses: {
        type: Sequelize.ENUM("OUI", "NON", "PARTIELLEMENT"),
        allowNull: true,
      },

      // E. Caractéristiques du bien
      nombreChambres: { type: Sequelize.STRING(20), allowNull: true },
      nombreChambresAutre: { type: Sequelize.STRING(50), allowNull: true },
      nombreSalons: { type: Sequelize.STRING(20), allowNull: true },
      nombreToilettes: { type: Sequelize.STRING(20), allowNull: true },
      equipements: { type: Sequelize.JSON, allowNull: true },
      avantages: { type: Sequelize.JSON, allowNull: true },
      avantageAutre: { type: Sequelize.STRING(255), allowNull: true },

      // F. Disponibilité & urgence
      urgence: {
        type: Sequelize.ENUM("IMMEDIAT", "1_2_SEMAINES", "1_MOIS", "FLEXIBLE", "AUTRE"),
        allowNull: true,
      },
      urgenceAutre: { type: Sequelize.STRING(150), allowNull: true },
      dateEntree: { type: Sequelize.DATEONLY, allowNull: true },

      // G. Informations complémentaires
      nombreOccupants: { type: Sequelize.INTEGER, allowNull: true },
      elementsParticuliers: { type: Sequelize.JSON, allowNull: true },
      orienteParAgent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      codeCommissionnaire: { type: Sequelize.STRING(50), allowNull: true },
      autresInfos: { type: Sequelize.TEXT, allowNull: true },

      // Engagement — le formulaire ne peut pas être soumis sans acceptation
      // (contrôlé côté contrôleur) ; l'horodatage est la preuve conservée.
      conditionsAcceptedAt: { type: Sequelize.DATE, allowNull: false },

      // Client CRM créé/rattaché à partir de cette demande.
      idClient: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "clients", key: "idClient" },
      },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("rentalRequests", ["phone"]);
    await queryInterface.addIndex("rentalRequests", ["createdAt"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("rentalRequests");
  },
};
