import { createRequire } from "module";

// Référentiel des quartiers et avenues de Bukavu fourni par l'agence
// (« Quartiers par commune »). Copie identique de
// Frontend/lib/locations.data.json — pas de package partagé entre les
// projets (CLAUDE.md §9) : une mise à jour se fait des deux côtés.
const require = createRequire(import.meta.url);
export const BUKAVU_LOCATIONS = require("./bukavuLocations.data.json");

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

// Retrouve le quartier officiel d'une commune, insensible à la casse et
// aux accents ("nyalukemba" → "Nyalukemba"). `null` si le quartier
// n'appartient pas à la commune : la liste des quartiers est fermée,
// un quartier inconnu est une erreur de saisie, pas une donnée nouvelle.
export const resolveQuartier = (commune, quartier) => {
  const quartiers = Object.keys(BUKAVU_LOCATIONS[commune] ?? {});
  const wanted = normalize(quartier);
  return quartiers.find((name) => normalize(name) === wanted) ?? null;
};
