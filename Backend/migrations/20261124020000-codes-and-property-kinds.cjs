"use strict";

// Conventions de codes (une seule source de vérité : shared/codes.js) :
//   Commissionnaire CMR-NNN, Collecteur CTR-NNN, Client CCL-NNN.
// L'ancien préfixe commissionnaire « CCM » devient « CMR » partout où il est
// stocké, et le numéro de dossier client CLI-AAAA-NNNNNN devient CCL-NNN.

const OLD_PROPERTY_TYPES = [
  "APPARTEMENT",
  "MAISON",
  "CONSTRUCTION_DURABLE",
  "CONSTRUCTION_SEMI_DURABLE",
  "TERRAIN_PLAT",
  "TERRAIN_PENTE",
  "PARCELLE",
  "CHAMBRE",
];
// Liste unique de l'agence : Appartement, Maison, Terrain, Chambrette,
// Bureau, Local commercial. Les anciens types restent valides pour les
// biens déjà enregistrés.
const NEW_PROPERTY_TYPES = ["TERRAIN", "CHAMBRETTE", "BUREAU", "LOCAL_COMMERCIAL"];
const ALL_PROPERTY_TYPES = [...OLD_PROPERTY_TYPES, ...NEW_PROPERTY_TYPES];
// Pourcentage de marge repris d'un type voisin existant.
const MARGIN_SOURCE = {
  TERRAIN: "TERRAIN_PLAT",
  CHAMBRETTE: "CHAMBRE",
  BUREAU: "APPARTEMENT",
  LOCAL_COMMERCIAL: "APPARTEMENT",
};

const pad = (n) => String(n).padStart(3, "0");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const q = queryInterface.sequelize;

    // 1. Compteurs de codes, incrémentés sous verrou (aucun doublon en cas
    //    de créations simultanées).
    await queryInterface.createTable("codeSequences", {
      name: { type: Sequelize.STRING(20), primaryKey: true },
      lastValue: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });

    // 2. Profil du terrain : commissionnaire (apporte clients et biens,
    //    commissionné) ou collecteur (relève des biens).
    await queryInterface.addColumn("commissionnaires", "profil", {
      type: Sequelize.ENUM("COMMISSIONNAIRE", "COLLECTEUR"),
      allowNull: false,
      defaultValue: "COMMISSIONNAIRE",
    });

    // 3. Pièce d'identité : type et verso (le recto reste idDocumentPath).
    await queryInterface.addColumn("persons", "idDocumentType", {
      type: Sequelize.ENUM("CARTE_ELECTEUR", "CARTE_IDENTITE"),
      allowNull: true,
    });
    await queryInterface.addColumn("persons", "idDocumentVersoPath", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("persons", "idDocumentVersoMimeType", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    // 4. CCM → CMR partout où un code commissionnaire est stocké.
    for (const [table, column] of [
      ["commissionnaires", "code"],
      ["properties", "codeCommissionnaire"],
      ["rentalRequests", "codeCommissionnaire"],
      ["clients", "sourceCommissionnaireCode"],
    ]) {
      await q.query(
        `UPDATE \`${table}\` SET \`${column}\` = CONCAT('CMR-', LPAD(REGEXP_REPLACE(\`${column}\`, '^CCM[ -]?', ''), 3, '0'))
         WHERE \`${column}\` REGEXP '^CCM[ -]?[0-9]+$'`
      );
    }

    // 5. Numéro de client CCL-NNN, dans l'ordre de création.
    const [clients] = await q.query("SELECT idClient FROM clients ORDER BY idClient ASC");
    let clientCounter = 0;
    for (const client of clients) {
      clientCounter += 1;
      await q.query("UPDATE clients SET dossierNumber = ? WHERE idClient = ?", {
        replacements: [`CCL-${pad(clientCounter)}`, client.idClient],
      });
    }

    // 6. Compteurs repris des codes existants.
    const [[cmr]] = await q.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(code, 5) AS UNSIGNED)), 0) AS n FROM commissionnaires WHERE code REGEXP '^CMR-[0-9]+$'"
    );
    const [[ctr]] = await q.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(code, 5) AS UNSIGNED)), 0) AS n FROM commissionnaires WHERE code REGEXP '^CTR-[0-9]+$'"
    );
    await queryInterface.bulkInsert("codeSequences", [
      { name: "CMR", lastValue: Number(cmr.n) },
      { name: "CTR", lastValue: Number(ctr.n) },
      { name: "CCL", lastValue: clientCounter },
    ]);

    // 7. Types de biens de la liste unique, avec leurs lignes de marge.
    for (const table of ["properties", "marginSettings"]) {
      await queryInterface.changeColumn(table, "propertyType", {
        type: Sequelize.ENUM(...ALL_PROPERTY_TYPES),
        allowNull: false,
      });
    }
    const now = new Date();
    for (const [propertyType, source] of Object.entries(MARGIN_SOURCE)) {
      for (const stayType of ["LONGUE_DUREE", "COURT_SEJOUR"]) {
        const [[existing]] = await q.query(
          "SELECT defaultPercentage FROM marginSettings WHERE propertyType = ? AND stayType = ?",
          { replacements: [source, stayType] }
        );
        await queryInterface.bulkInsert("marginSettings", [
          {
            propertyType,
            stayType,
            defaultPercentage: existing ? existing.defaultPercentage : stayType === "COURT_SEJOUR" ? 20 : 10,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const q = queryInterface.sequelize;

    await q.query("DELETE FROM marginSettings WHERE propertyType IN (?)", { replacements: [NEW_PROPERTY_TYPES] });
    await q.query("UPDATE properties SET propertyType = 'TERRAIN_PLAT' WHERE propertyType = 'TERRAIN'");
    await q.query("UPDATE properties SET propertyType = 'CHAMBRE' WHERE propertyType = 'CHAMBRETTE'");
    await q.query("UPDATE properties SET propertyType = 'APPARTEMENT' WHERE propertyType IN ('BUREAU', 'LOCAL_COMMERCIAL')");
    for (const table of ["properties", "marginSettings"]) {
      await queryInterface.changeColumn(table, "propertyType", {
        type: Sequelize.ENUM(...OLD_PROPERTY_TYPES),
        allowNull: false,
      });
    }

    await q.query(
      "UPDATE clients SET dossierNumber = CONCAT('CLI-', YEAR(createdAt), '-', LPAD(idClient, 6, '0'))"
    );
    for (const [table, column] of [
      ["commissionnaires", "code"],
      ["properties", "codeCommissionnaire"],
      ["rentalRequests", "codeCommissionnaire"],
      ["clients", "sourceCommissionnaireCode"],
    ]) {
      await q.query(
        `UPDATE \`${table}\` SET \`${column}\` = CONCAT('CCM-', SUBSTRING(\`${column}\`, 5)) WHERE \`${column}\` REGEXP '^CMR-[0-9]+$'`
      );
    }

    await queryInterface.removeColumn("persons", "idDocumentVersoMimeType");
    await queryInterface.removeColumn("persons", "idDocumentVersoPath");
    await queryInterface.removeColumn("persons", "idDocumentType");
    await queryInterface.removeColumn("commissionnaires", "profil");
    await queryInterface.dropTable("codeSequences");
  },
};
