import data from "./locations.data.json"

// Référentiel des quartiers et avenues de Bukavu, fourni par l'agence
// (« Quartiers par commune »). Même fichier que
// Backend/shared/bukavuLocations.data.json : les deux projets restent
// indépendants (CLAUDE.md §9), une mise à jour doit être faite des deux
// côtés — le Backend rejette un quartier qui n'appartient pas à la commune.
export type CommuneCode = "IBANDA" | "KADUTU" | "BAGIRA"

export const BUKAVU_LOCATIONS = data as Record<CommuneCode, Record<string, string[]>>

// Valeur réservée au choix « autre avenue » : la liste des avenues n'est pas
// exhaustive (une rue récente ou un repère local peut manquer), celle des
// quartiers l'est.
export const AUTRE_AVENUE = "AUTRE"

export const quartiersOf = (commune: string): string[] =>
  Object.keys(BUKAVU_LOCATIONS[commune as CommuneCode] ?? {})

export const avenuesOf = (commune: string, quartier: string): string[] =>
  BUKAVU_LOCATIONS[commune as CommuneCode]?.[quartier] ?? []

export const toChoices = (values: string[]) => values.map((value) => ({ value, label: value }))
