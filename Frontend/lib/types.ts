export type PropertyCategory = "RENT" | "SALE"

export type PropertyType =
  | "APPARTEMENT"
  | "MAISON"
  | "CONSTRUCTION_DURABLE"
  | "CONSTRUCTION_SEMI_DURABLE"
  | "TERRAIN_PLAT"
  | "TERRAIN_PENTE"

export type PropertyStatut = "DISPONIBLE" | "RESERVE" | "LOUE_VENDU"

export type RentalUnit = "DAY" | "MONTH" | "YEAR"

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APPARTEMENT: "Appartement",
  MAISON: "Maison",
  CONSTRUCTION_DURABLE: "Construction durable",
  CONSTRUCTION_SEMI_DURABLE: "Construction semi-durable",
  TERRAIN_PLAT: "Terrain plat",
  TERRAIN_PENTE: "Terrain en pente",
}

export const RENTAL_PROPERTY_TYPES: PropertyType[] = ["APPARTEMENT", "MAISON"]
export const SALE_PROPERTY_TYPES: PropertyType[] = [
  "CONSTRUCTION_DURABLE",
  "CONSTRUCTION_SEMI_DURABLE",
  "TERRAIN_PLAT",
  "TERRAIN_PENTE",
]
export const LAND_PROPERTY_TYPES: PropertyType[] = ["TERRAIN_PLAT", "TERRAIN_PENTE"]

export const RENTAL_UNIT_LABELS: Record<RentalUnit, string> = {
  DAY: "Jours",
  MONTH: "Mois",
  YEAR: "Ans",
}

export interface RentalDetails {
  idProperty: number
  guarantee: number | null
  unit: RentalUnit
}

export interface SaleDetails {
  idProperty: number
}

export interface PropertyImageEntry {
  idPropertyImage: number
  idProperty: number
  image: string
}

export interface PropertyPhoneEntry {
  idPropertyPhone: number
  idProperty: number
  phoneNumber: string
}

// Forme réelle renvoyée par le Backend (Backend/controllers/property.controller.js
// + Backend/utils/serializers/property.serializer.js). `margin` est absent
// de la réponse si l'utilisateur n'a pas la permission property:margin:read
// (field-level authorization, CLAUDE.md §5) — jamais présumer sa présence.
export interface Property {
  idProperty: number
  category: PropertyCategory
  propertyType: PropertyType
  quartier?: string | null
  avenue?: string | null
  fullAddress?: string | null
  floors?: number | null
  bedrooms?: number | null
  livingRooms?: number | null
  toilets?: number | null
  kitchens?: number | null
  price: number
  margin?: number
  statut: PropertyStatut
  codeCommissionnaire?: string | null
  informateur?: string | null
  idBailleur?: number | null
  latitude?: number | null
  longitude?: number | null
  description?: string | null
  createdBy?: number
  assignedTo?: number | null
  rentalDetails?: RentalDetails
  saleDetails?: SaleDetails
  images?: PropertyImageEntry[]
  phones?: PropertyPhoneEntry[]
  scores?: unknown
  createdAt: string
  updatedAt: string
}

export interface PropertyPayload {
  category: PropertyCategory
  propertyType: PropertyType
  quartier?: string
  avenue?: string
  fullAddress?: string
  floors?: number
  bedrooms?: number
  livingRooms?: number
  toilets?: number
  kitchens?: number
  price?: number
  margin?: number
  statut?: PropertyStatut
  description?: string
  guarantee?: number
  unit?: RentalUnit
  phones?: string[]
}

export interface Favorite {
  idFavorite: number
  idUser: number
  idProperty: number
  createdAt: string
}
