"use strict";

/** @type {import('sequelize-cli').Migration} */
// GOAL 2 — upload de médias (images + vidéos) : ordre de galerie sur les
// images existantes, nouvelle table pour les vidéos (jamais une colonne
// polymorphe partagée avec propertyImages, cf. commentaire du modèle).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("propertyImages", "order", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.createTable("propertyVideos", {
      idPropertyVideo: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      idProperty: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "properties", key: "idProperty" },
        onDelete: "CASCADE",
      },
      video: { type: Sequelize.STRING, allowNull: false },
      order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("propertyVideos");
    await queryInterface.removeColumn("propertyImages", "order");
  },
};
