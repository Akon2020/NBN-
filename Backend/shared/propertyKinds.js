// Liste unique des types de biens de l'agence, réutilisée par les
// formulaires, les filtres et les indicateurs. Les anciens types encore
// présents en base sont rattachés à l'un des six. Même table côté
// Frontend : lib/propertyKinds.ts.
export const PROPERTY_KINDS = [
  { value: "APPARTEMENT", label: "Appartement" },
  { value: "MAISON", label: "Maison" },
  { value: "TERRAIN", label: "Terrain" },
  { value: "CHAMBRETTE", label: "Chambrette" },
  { value: "BUREAU", label: "Bureau" },
  { value: "LOCAL_COMMERCIAL", label: "Local commercial" },
];

export const PROPERTY_KIND_VALUES = PROPERTY_KINDS.map((kind) => kind.value);

export const KIND_OF_TYPE = {
  APPARTEMENT: "APPARTEMENT",
  MAISON: "MAISON",
  CONSTRUCTION_DURABLE: "MAISON",
  CONSTRUCTION_SEMI_DURABLE: "MAISON",
  TERRAIN: "TERRAIN",
  TERRAIN_PLAT: "TERRAIN",
  TERRAIN_PENTE: "TERRAIN",
  PARCELLE: "TERRAIN",
  CHAMBRE: "CHAMBRETTE",
  CHAMBRETTE: "CHAMBRETTE",
  BUREAU: "BUREAU",
  LOCAL_COMMERCIAL: "LOCAL_COMMERCIAL",
};

export const propertyKindOf = (propertyType) => KIND_OF_TYPE[propertyType] ?? null;

/** Tous les types stockés qui relèvent d'un type de la liste unique. */
export const typesOfKind = (kind) =>
  Object.entries(KIND_OF_TYPE)
    .filter(([, value]) => value === kind)
    .map(([type]) => type);

const LEGACY_LABELS = {
  CONSTRUCTION_DURABLE: "Maison (construction durable)",
  CONSTRUCTION_SEMI_DURABLE: "Maison (semi-durable)",
  TERRAIN_PLAT: "Terrain plat",
  TERRAIN_PENTE: "Terrain en pente",
  PARCELLE: "Terrain",
  CHAMBRE: "Chambrette",
};

/** Libellé lisible d'un type stocké (ancien ou de la liste unique). */
export const propertyKindLabel = (propertyType) =>
  PROPERTY_KINDS.find((kind) => kind.value === propertyType)?.label ??
  LEGACY_LABELS[propertyType] ??
  propertyType ??
  "Bien";
