"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("bailleurs", {
      idBailleur: {
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
        type: Sequelize.ENUM("PROPRIETAIRE", "MANDATAIRE"),
        allowNull: false,
      },
      typeCollaboration: {
        type: Sequelize.ENUM("OCCASIONNELLE", "REGULIERE", "EXCLUSIVE"),
        allowNull: true,
      },
      dureeCollaboration: { type: Sequelize.STRING(50), allowNull: true },
      // Donnée financière sensible — protégée en sérialisation comme
      // Property.margin (BACK-G03), via la permission bailleur:marge:read.
      margeAgence: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      frequenceContactJours: { type: Sequelize.INTEGER, allowNull: true },
      dernierContact: { type: Sequelize.DATE, allowNull: true },
      prochainContact: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      fiabilite: {
        type: Sequelize.ENUM("SERIEUX", "MOYEN", "DIFFICILE"),
        allowNull: true,
      },
      restrictions: { type: Sequelize.STRING(255), allowNull: true },
      exigencesFinancieres: { type: Sequelize.TEXT, allowNull: true },
      statutRelation: {
        type: Sequelize.ENUM("ACTIF", "INACTIF", "A_RELANCER", "SUSPENDU"),
        allowNull: false,
        defaultValue: "ACTIF",
      },
      valeurBailleur: {
        type: Sequelize.ENUM("FAIBLE", "MOYEN", "FORT", "PARTENAIRE_CLE"),
        allowNull: true,
      },
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
    await queryInterface.dropTable("bailleurs");
  },
};
