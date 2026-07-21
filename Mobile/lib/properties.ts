import { api } from './api';

export type PropertyCategory = 'RENT' | 'SALE';

export type PropertyType =
  | 'APPARTEMENT'
  | 'MAISON'
  | 'CONSTRUCTION_DURABLE'
  | 'CONSTRUCTION_SEMI_DURABLE'
  | 'TERRAIN_PLAT'
  | 'TERRAIN_PENTE';

export type PropertyStatut = 'DISPONIBLE' | 'RESERVE' | 'LOUE_VENDU';

export type RentalUnit = 'DAY' | 'MONTH' | 'YEAR';

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APPARTEMENT: 'Appartement',
  MAISON: 'Maison',
  CONSTRUCTION_DURABLE: 'Construction durable',
  CONSTRUCTION_SEMI_DURABLE: 'Construction semi-durable',
  TERRAIN_PLAT: 'Terrain plat',
  TERRAIN_PENTE: 'Terrain en pente',
};

export const RENTAL_UNIT_LABELS: Record<RentalUnit, string> = {
  DAY: 'Jours',
  MONTH: 'Mois',
  YEAR: 'Ans',
};

export interface RentalDetails {
  idProperty: number;
  guarantee: number | null;
  unit: RentalUnit;
}

export interface SaleDetails {
  idProperty: number;
}

export interface PropertyImageEntry {
  idPropertyImage: number;
  idProperty: number;
  image: string;
}

export interface PropertyPhoneEntry {
  idPropertyPhone: number;
  idProperty: number;
  phoneNumber: string;
}

// `margin` n'est jamais présent pour la consultation "client final" (route
// publique, MOBILE-G03) ni pour un rôle interne sans property:margin:read —
// même field-level authorization que le Frontend (CLAUDE.md §5).
export interface Property {
  idProperty: number;
  category: PropertyCategory;
  propertyType: PropertyType;
  quartier?: string | null;
  avenue?: string | null;
  fullAddress?: string | null;
  floors?: number | null;
  bedrooms?: number | null;
  livingRooms?: number | null;
  toilets?: number | null;
  kitchens?: number | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  price: number;
  margin?: number;
  statut: PropertyStatut;
  description?: string | null;
  rentalDetails?: RentalDetails;
  saleDetails?: SaleDetails;
  images?: PropertyImageEntry[];
  phones?: PropertyPhoneEntry[];
  createdAt: string;
  updatedAt: string;
}

// Lecture publique (sans compte) — profil "client final" du CDC, qui n'a
// pas de compte User dans ce système (CLAUDE.md §4). Restreinte côté
// Backend aux biens DISPONIBLE.
export async function getPublicProperties(): Promise<Property[]> {
  const res = await api.get('/api/properties/public');
  return res.data.propertiesInfo;
}

export async function getPublicProperty(id: number): Promise<Property> {
  const res = await api.get(`/api/properties/public/${id}`);
  return res.data;
}

// Lecture authentifiée — profil "interne" (staff avec un vrai compte).
// Filtres optionnels envoyés au Backend (GET /api/properties?category=...,
// déjà réel depuis la recherche globale du Frontend Admin) — jamais un
// téléchargement de tout le catalogue suivi d'un filtrage côté client.
export async function getAllProperties(filters?: { category?: PropertyCategory }): Promise<Property[]> {
  const res = await api.get('/api/properties', { params: filters });
  return res.data.propertiesInfo;
}

export async function getSingleProperty(id: number): Promise<Property> {
  const res = await api.get(`/api/properties/${id}`);
  return res.data;
}
