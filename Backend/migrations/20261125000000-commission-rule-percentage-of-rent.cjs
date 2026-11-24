"use strict";

// Décision de l'agence (2026-11-25) : la commission d'un commissionnaire est
// un pourcentage du loyer (ou du prix de vente). La règle passe donc de
// « MANUEL » à « POURCENTAGE » ; le taux lui-même se règle dans Paramètres.
// Une règle déjà choisie par l'agence (autre que MANUEL) n'est pas touchée.
const KEY = "commissions.commissionnaireRule";

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    const [rows] = await q.query("SELECT idAppSetting, value FROM appSettings WHERE `key` = :key", { replacements: { key: KEY } });
    for (const row of rows) {
      let value;
      try {
        value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      } catch {
        value = null;
      }
      if (value && value.mode !== "MANUEL") continue;
      await q.query("UPDATE appSettings SET value = :value, updatedAt = :now WHERE idAppSetting = :id", {
        replacements: {
          id: row.idAppSetting,
          now: new Date(),
          value: JSON.stringify({ mode: "POURCENTAGE", valeur: value?.valeur ?? null, parType: value?.parType ?? {} }),
        },
      });
    }
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    const [rows] = await q.query("SELECT idAppSetting, value FROM appSettings WHERE `key` = :key", { replacements: { key: KEY } });
    for (const row of rows) {
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      if (value?.mode !== "POURCENTAGE" || value.valeur != null || Object.keys(value.parType ?? {}).length) continue;
      await q.query("UPDATE appSettings SET value = :value WHERE idAppSetting = :id", {
        replacements: { id: row.idAppSetting, value: JSON.stringify({ mode: "MANUEL", valeur: null, parType: {} }) },
      });
    }
  },
};
