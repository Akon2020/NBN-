// Liste unique des types de biens présentés à l'agence et aux clients
// (formulaires, filtres de la galerie, indicateurs du tableau de bord).
// Les anciennes valeurs encore présentes en base (constructions, terrains
// plat/pente, parcelle, chambre) sont rattachées à l'un de ces six types
// pour l'affichage et les compteurs. Même table côté Backend :
// `shared/propertyKinds.js`.

export const PROPERTY_KINDS = [
  { value: "APPARTEMENT", label: "Appartement" },
  { value: "MAISON", label: "Maison" },
  { value: "TERRAIN", label: "Terrain" },
  { value: "CHAMBRETTE", label: "Chambrette" },
  { value: "BUREAU", label: "Bureau" },
  { value: "LOCAL_COMMERCIAL", label: "Local commercial" },
] as const

export type PropertyKind = (typeof PROPERTY_KINDS)[number]["value"]

const KIND_OF_TYPE: Record<string, PropertyKind> = {
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
}

export const propertyKindOf = (propertyType?: string | null): PropertyKind | null =>
  (propertyType && KIND_OF_TYPE[propertyType]) || null

export const propertyKindLabel = (propertyType?: string | null): string => {
  const kind = propertyKindOf(propertyType)
  return PROPERTY_KINDS.find((k) => k.value === kind)?.label ?? "Bien"
}

export const isLandKind = (propertyType?: string | null) =>
  propertyKindOf(propertyType) === "TERRAIN"
