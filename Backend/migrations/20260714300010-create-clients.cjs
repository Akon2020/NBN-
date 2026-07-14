"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("clients", {
      idClient: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      idPerson: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "persons", key: "idPerson" },
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM("LOCATAIRE", "ACHETEUR"),
        allowNull: false,
      },
      sousType: {
        type: Sequelize.ENUM("PARTICULIER", "PROFESSIONNEL", "ENTREPRISE", "DIASPORA"),
        allowNull: true,
      },
      source: {
        type: Sequelize.ENUM("TERRAIN", "WHATSAPP", "APPEL", "RECOMMANDATION", "COMMISSIONNAIRE"),
        allowNull: true,
      },
      sourceCommissionnaireCode: { type: Sequelize.STRING(50), allowNull: true },
      besoinTypeBien: { type: Sequelize.STRING(100), allowNull: true },
      besoinUsage: {
        type: Sequelize.ENUM("HABITATION", "PROFESSIONNEL", "COMMERCIAL", "MIXTE"),
        allowNull: true,
      },
      localisationVille: { type: Sequelize.STRING(100), allowNull: true },
      localisationQuartiers: { type: Sequelize.TEXT, allowNull: true },
      localisationFlexibilite: {
        type: Sequelize.ENUM("STRICT", "FLEXIBLE"),
        allowNull: true,
      },
      budgetMin: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      budgetMax: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      urgence: {
        type: Sequelize.ENUM("IMMEDIAT", "1_2_SEMAINES", "1_MOIS", "FLEXIBLE"),
        allowNull: true,
      },
      dateSouhaitee: { type: Sequelize.DATEONLY, allowNull: true },
      score: {
        type: Sequelize.ENUM("SERIEUX", "MOYEN", "FAIBLE"),
        allowNull: true,
      },
      tags: { type: Sequelize.STRING(255), allowNull: true },
      statutPipeline: {
        type: Sequelize.ENUM(
          "NOUVEAU",
          "PROPOSE",
          "VISITE_PROGRAMMEE",
          "VISITE_EFFECTUEE",
          "NEGOCIATION",
          "CONCLU",
          "PERDU"
        ),
        allowNull: false,
        defaultValue: "NOUVEAU",
      },
      statutRelance: {
        type: Sequelize.ENUM("A_RELANCER", "RELANCE", "INACTIF"),
        allowNull: true,
      },
      dernierContact: { type: Sequelize.DATE, allowNull: true },
      prochaineRelance: { type: Sequelize.DATE, allowNull: true },
      notesAgent: { type: Sequelize.TEXT, allowNull: true },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: "users", key: "idUser" },
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("clients");
  },
};
