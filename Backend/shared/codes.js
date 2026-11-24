import { QueryTypes } from "sequelize";
import db from "../database/db.js";

// Conventions de codes de l'agence, une seule source de vérité.
//   Commissionnaire CMR-042, Collecteur CTR-007, Client CCL-118.
// CCL identifie uniquement un client. L'ancien préfixe « CCM » des
// commissionnaires est encore accepté à la saisie et ramené à CMR.
export const CODE_PREFIXES = Object.freeze({
  COMMISSIONNAIRE: "CMR",
  COLLECTEUR: "CTR",
  CLIENT: "CCL",
});

const LEGACY_PREFIXES = { CMR: ["CCM"] };

export const formatCode = (prefix, number) => `${prefix}-${String(number).padStart(3, "0")}`;

/**
 * "cmr 42", "CMR042", "CMR-042" (et "CCM-42" pour CMR) → "CMR-042".
 * `null` si la saisie ne suit pas le format du préfixe attendu.
 */
export const normalizeCode = (raw, prefix) => {
  const accepted = [prefix, ...(LEGACY_PREFIXES[prefix] ?? [])].join("|");
  const match = new RegExp(`^(?:${accepted})[\\s-]?(\\d{1,6})$`, "i").exec(String(raw ?? "").trim());
  return match ? formatCode(prefix, Number(match[1])) : null;
};

export const codePrefixOfProfil = (profil) =>
  profil === "COLLECTEUR" ? CODE_PREFIXES.COLLECTEUR : CODE_PREFIXES.COMMISSIONNAIRE;

/**
 * Prochain code d'une séquence, réservé sous verrou de ligne dans la
 * transaction de l'appelant : deux créations simultanées n'obtiennent
 * jamais le même numéro. Le numéro est perdu si la transaction échoue
 * (un trou dans la suite vaut mieux qu'un doublon).
 */
export const nextSequenceCode = async (prefix, transaction) => {
  if (!transaction) throw new Error("nextSequenceCode exige une transaction");
  // Une seule instruction qui verrouille la ligne en écriture d'emblée :
  // pas de verrou partagé à promouvoir, donc pas d'interblocage entre deux
  // créations simultanées (la seconde attend la fin de la première).
  // LAST_INSERT_ID(expr) mémorise la valeur pour cette connexion.
  await db.query(
    "INSERT INTO codeSequences (name, lastValue) VALUES (?, LAST_INSERT_ID(1)) " +
      "ON DUPLICATE KEY UPDATE lastValue = LAST_INSERT_ID(lastValue + 1)",
    { replacements: [prefix], transaction }
  );
  const [row] = await db.query("SELECT LAST_INSERT_ID() AS value", { type: QueryTypes.SELECT, transaction });
  return formatCode(prefix, Number(row.value));
};

/** Aperçu du prochain code, sans le réserver (affichage « Sera généré : »). */
export const peekSequenceCode = async (prefix) => {
  const [row] = await db.query("SELECT lastValue FROM codeSequences WHERE name = ?", {
    replacements: [prefix],
    type: QueryTypes.SELECT,
  });
  return formatCode(prefix, Number(row?.lastValue ?? 0) + 1);
};
