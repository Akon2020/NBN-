"use strict";

const EXISTING_PROPERTY_TYPES = [
  "APPARTEMENT",
  "MAISON",
  "CONSTRUCTION_DURABLE",
  "CONSTRUCTION_SEMI_DURABLE",
  "TERRAIN_PLAT",
  "TERRAIN_PENTE",
];

// Le formulaire de collecte terrain propose « Parcelle » et « Chambre »,
// deux types réellement collectés qui n'existaient pas au catalogue.
const NEW_PROPERTY_TYPES = ["PARCELLE", "CHAMBRE"];
const ALL_PROPERTY_TYPES = [...EXISTING_PROPERTY_TYPES, ...NEW_PROPERTY_TYPES];

const MISSION_TYPES = ["COLLECTE_BIEN", "APPORT_CLIENT", "SUIVI"];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Nouveaux types de bien — sur `properties` ET `marginSettings`,
    // les deux ENUM doivent rester alignés (un type sans ligne de marge
    // n'aurait aucun pourcentage effectif à appliquer).
    await queryInterface.changeColumn("properties", "propertyType", {
      type: Sequelize.ENUM(...ALL_PROPERTY_TYPES),
      allowNull: false,
    });
    await queryInterface.changeColumn("marginSettings", "propertyType", {
      type: Sequelize.ENUM(...ALL_PROPERTY_TYPES),
      allowNull: false,
    });

    // Mêmes valeurs par défaut que les types existants (10 % longue durée,
    // 20 % courte durée) — reconfigurables ensuite via /api/margin-settings.
    const now = new Date();
    const rows = [];
    NEW_PROPERTY_TYPES.forEach((propertyType) => {
      rows.push({
        propertyType,
        stayType: "LONGUE_DUREE",
        defaultPercentage: 10,
        createdAt: now,
        updatedAt: now,
      });
      rows.push({
        propertyType,
        stayType: "COURT_SEJOUR",
        defaultPercentage: 20,
        createdAt: now,
        updatedAt: now,
      });
    });
    await queryInterface.bulkInsert("marginSettings", rows);

    // 2. Caractéristiques réellement relevées sur le terrain, aujourd'hui
    // perdues faute de colonne (elles finissaient au mieux dans la
    // description libre, inexploitable en recherche/filtre).
    await queryInterface.addColumn("properties", "commune", {
      type: Sequelize.ENUM("IBANDA", "KADUTU", "BAGIRA"),
      allowNull: true,
    });
    await queryInterface.addColumn("properties", "depots", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("properties", "hasElectricity", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn("properties", "hasWater", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn("properties", "accessibilite", {
      type: Sequelize.ENUM("ROUTE_PRINCIPALE", "ROUTE_SECONDAIRE", "ACCES_DIFFICILE", "ACCES_FLEXIBLE"),
      allowNull: true,
    });
    await queryInterface.addColumn("properties", "disponibilite", {
      type: Sequelize.ENUM("IMMEDIATE", "BIENTOT", "INDISPONIBLE"),
      allowNull: true,
    });
    await queryInterface.addColumn("properties", "etatBien", {
      type: Sequelize.ENUM("NEUF", "MOYEN", "A_RENOVER"),
      allowNull: true,
    });
    await queryInterface.addColumn("properties", "observations", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // 3. Conditions du propriétaire relevées à la collecte — portées par
    // le Bailleur (c'est sa position, pas celle du bien : elle vaut pour
    // tous ses biens).
    await queryInterface.addColumn("bailleurs", "disponibiliteVisite", {
      type: Sequelize.ENUM("OUI", "NON", "SUR_PROGRAMME"),
      allowNull: true,
    });
    await queryInterface.addColumn("bailleurs", "accepteCommission", {
      type: Sequelize.ENUM("OUI", "NON", "A_NEGOCIER"),
      allowNull: true,
    });

    // 4. « Mise à jour d'un bien existant » est un quatrième type de
    // mission terrain réel, au même titre que les trois autres.
    await queryInterface.changeColumn("missions", "type", {
      type: Sequelize.ENUM(...MISSION_TYPES, "MISE_A_JOUR"),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("missions", "type", {
      type: Sequelize.ENUM(...MISSION_TYPES),
      allowNull: false,
    });

    await queryInterface.removeColumn("bailleurs", "accepteCommission");
    await queryInterface.removeColumn("bailleurs", "disponibiliteVisite");

    await queryInterface.removeColumn("properties", "observations");
    await queryInterface.removeColumn("properties", "etatBien");
    await queryInterface.removeColumn("properties", "disponibilite");
    await queryInterface.removeColumn("properties", "accessibilite");
    await queryInterface.removeColumn("properties", "hasWater");
    await queryInterface.removeColumn("properties", "hasElectricity");
    await queryInterface.removeColumn("properties", "depots");
    await queryInterface.removeColumn("properties", "commune");

    await queryInterface.bulkDelete("marginSettings", { propertyType: NEW_PROPERTY_TYPES });

    await queryInterface.changeColumn("marginSettings", "propertyType", {
      type: Sequelize.ENUM(...EXISTING_PROPERTY_TYPES),
      allowNull: false,
    });
    await queryInterface.changeColumn("properties", "propertyType", {
      type: Sequelize.ENUM(...EXISTING_PROPERTY_TYPES),
      allowNull: false,
    });
  },
};
