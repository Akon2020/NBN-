"use strict";

const PROPERTY_TYPES = [
  "APPARTEMENT",
  "MAISON",
  "CONSTRUCTION_DURABLE",
  "CONSTRUCTION_SEMI_DURABLE",
  "TERRAIN_PLAT",
  "TERRAIN_PENTE",
];

// GOAL 12 — courte durée (unit=DAY sur RentalProperty) justifie
// généralement un pourcentage de marge distinct de la longue durée
// (rotation plus fréquente, coûts de nettoyage/gestion plus élevés) :
// `MarginSetting` gagne une seconde dimension `stayType`, configurable
// indépendamment par type de bien plutôt qu'un pourcentage unique partagé.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeIndex("marginSettings", "propertyType");

    await queryInterface.addColumn("marginSettings", "stayType", {
      type: Sequelize.ENUM("LONGUE_DUREE", "COURT_SEJOUR"),
      allowNull: false,
      defaultValue: "LONGUE_DUREE",
    });

    await queryInterface.addIndex("marginSettings", ["propertyType", "stayType"], {
      unique: true,
      name: "margin_settings_type_stay_unique",
    });

    await queryInterface.addColumn("marginHistories", "stayType", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    const now = new Date();
    await queryInterface.bulkInsert(
      "marginSettings",
      PROPERTY_TYPES.map((propertyType) => ({
        propertyType,
        stayType: "COURT_SEJOUR",
        defaultPercentage: 20,
        createdAt: now,
        updatedAt: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("marginHistories", "stayType");
    await queryInterface.bulkDelete("marginSettings", { stayType: "COURT_SEJOUR" });
    await queryInterface.removeIndex("marginSettings", "margin_settings_type_stay_unique");
    await queryInterface.removeColumn("marginSettings", "stayType");
    await queryInterface.addIndex("marginSettings", ["propertyType"], {
      unique: true,
      name: "propertyType",
    });
  },
};
