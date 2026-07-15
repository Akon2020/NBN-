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

// --- CRM (BACK-G06/BACK-G08) ---------------------------------------------

export interface Person {
  idPerson: number
  fullName: string
  phone?: string | null
  email?: string | null
  idNumber?: string | null
  idUser?: number | null
}

export type ClientType = "LOCATAIRE" | "ACHETEUR"
export type ClientSousType = "PARTICULIER" | "PROFESSIONNEL" | "ENTREPRISE" | "DIASPORA"
export type ClientSource = "TERRAIN" | "WHATSAPP" | "APPEL" | "RECOMMANDATION" | "COMMISSIONNAIRE"
export type ClientBesoinUsage = "HABITATION" | "PROFESSIONNEL" | "COMMERCIAL" | "MIXTE"
export type ClientFlexibilite = "STRICT" | "FLEXIBLE"
export type ClientUrgence = "IMMEDIAT" | "1_2_SEMAINES" | "1_MOIS" | "FLEXIBLE"
export type ClientScore = "SERIEUX" | "MOYEN" | "FAIBLE"
export type ClientStatutRelance = "A_RELANCER" | "RELANCE" | "INACTIF"
export type ClientStatutPipeline =
  | "NOUVEAU"
  | "PROPOSE"
  | "VISITE_PROGRAMMEE"
  | "VISITE_EFFECTUEE"
  | "NEGOCIATION"
  | "CONCLU"
  | "PERDU"

export const CLIENT_PIPELINE_STAGES: ClientStatutPipeline[] = [
  "NOUVEAU",
  "PROPOSE",
  "VISITE_PROGRAMMEE",
  "VISITE_EFFECTUEE",
  "NEGOCIATION",
  "CONCLU",
  "PERDU",
]

export const CLIENT_PIPELINE_LABELS: Record<ClientStatutPipeline, string> = {
  NOUVEAU: "Nouveau",
  PROPOSE: "Proposé",
  VISITE_PROGRAMMEE: "Visite programmée",
  VISITE_EFFECTUEE: "Visite effectuée",
  NEGOCIATION: "Négociation",
  CONCLU: "Conclu",
  PERDU: "Perdu",
}

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  LOCATAIRE: "Locataire",
  ACHETEUR: "Acheteur",
}

export const CLIENT_SCORE_LABELS: Record<ClientScore, string> = {
  SERIEUX: "Sérieux",
  MOYEN: "Moyen",
  FAIBLE: "Faible",
}

export interface Client {
  idClient: number
  idPerson: number
  type: ClientType
  sousType?: ClientSousType | null
  source?: ClientSource | null
  sourceCommissionnaireCode?: string | null
  besoinTypeBien?: string | null
  besoinUsage?: ClientBesoinUsage | null
  localisationVille?: string | null
  localisationQuartiers?: string | null
  localisationFlexibilite?: ClientFlexibilite | null
  budgetMin?: number | null
  budgetMax?: number | null
  urgence?: ClientUrgence | null
  dateSouhaitee?: string | null
  score?: ClientScore | null
  tags?: string | null
  statutPipeline: ClientStatutPipeline
  statutRelance?: ClientStatutRelance | null
  dernierContact?: string | null
  prochaineRelance?: string | null
  notesAgent?: string | null
  createdBy?: number | null
  person?: Person
  createdAt: string
  updatedAt: string
}

export interface ClientCreatePayload {
  idPerson?: number
  fullName?: string
  phone?: string
  email?: string
  type: ClientType
  sousType?: ClientSousType
  source?: ClientSource
}

export interface ClientUpdatePayload {
  sousType?: ClientSousType
  source?: ClientSource
  sourceCommissionnaireCode?: string
  besoinTypeBien?: string
  besoinUsage?: ClientBesoinUsage
  localisationVille?: string
  localisationQuartiers?: string
  localisationFlexibilite?: ClientFlexibilite
  budgetMin?: number
  budgetMax?: number
  urgence?: ClientUrgence
  dateSouhaitee?: string
  score?: ClientScore
  tags?: string
  statutPipeline?: ClientStatutPipeline
  statutRelance?: ClientStatutRelance
  dernierContact?: string
  prochaineRelance?: string
  notesAgent?: string
}

export type BailleurType = "PROPRIETAIRE" | "MANDATAIRE"
export type BailleurTypeCollaboration = "OCCASIONNELLE" | "REGULIERE" | "EXCLUSIVE"
export type BailleurFiabilite = "SERIEUX" | "MOYEN" | "DIFFICILE"
export type BailleurStatutRelation = "ACTIF" | "INACTIF" | "A_RELANCER" | "SUSPENDU"
export type BailleurValeur = "FAIBLE" | "MOYEN" | "FORT" | "PARTENAIRE_CLE"

export const BAILLEUR_TYPE_LABELS: Record<BailleurType, string> = {
  PROPRIETAIRE: "Propriétaire",
  MANDATAIRE: "Mandataire",
}

export const BAILLEUR_STATUT_LABELS: Record<BailleurStatutRelation, string> = {
  ACTIF: "Actif",
  INACTIF: "Inactif",
  A_RELANCER: "À relancer",
  SUSPENDU: "Suspendu",
}

export const BAILLEUR_VALEUR_LABELS: Record<BailleurValeur, string> = {
  FAIBLE: "Faible",
  MOYEN: "Moyen",
  FORT: "Fort",
  PARTENAIRE_CLE: "Partenaire clé",
}

// `margeAgence` est absent de la réponse si l'utilisateur n'a pas
// `bailleur:marge:read` (field-level authorization, même principe que
// Property.margin) — jamais présumer sa présence.
export interface Bailleur {
  idBailleur: number
  idPerson: number
  type: BailleurType
  typeCollaboration?: BailleurTypeCollaboration | null
  dureeCollaboration?: string | null
  margeAgence?: number
  frequenceContactJours?: number | null
  dernierContact?: string | null
  prochainContact?: string | null
  notes?: string | null
  fiabilite?: BailleurFiabilite | null
  restrictions?: string | null
  exigencesFinancieres?: string | null
  statutRelation: BailleurStatutRelation
  valeurBailleur?: BailleurValeur | null
  createdBy?: number | null
  person?: Person
  createdAt: string
  updatedAt: string
}

export interface BailleurCreatePayload {
  idPerson?: number
  fullName?: string
  phone?: string
  email?: string
  type: BailleurType
  typeCollaboration?: BailleurTypeCollaboration
  margeAgence?: number
}

export interface BailleurUpdatePayload {
  typeCollaboration?: BailleurTypeCollaboration
  dureeCollaboration?: string
  margeAgence?: number
  frequenceContactJours?: number
  dernierContact?: string
  prochainContact?: string
  notes?: string
  fiabilite?: BailleurFiabilite
  restrictions?: string
  exigencesFinancieres?: string
  statutRelation?: BailleurStatutRelation
  valeurBailleur?: BailleurValeur
}

// --- Field Operations (BACK-G09/G10/G11) ----------------------------------

export type CommissionnaireNiveau = "JUNIOR" | "CONFIRME" | "SENIOR"
export type CommissionnaireStatut = "ACTIF" | "OBSERVATION" | "SUSPENDU" | "EXCLU"
export type CommissionnaireClassement = "ELITE" | "TRES_PERFORMANT" | "MOYEN" | "RISQUE"
export type IncidentType = "RETARD" | "DONNEES_INCOMPLETES" | "NON_RESPECT_REGLES" | "AUTRE"
export type IncidentGravite = "MINEUR" | "MODERE" | "MAJEUR"

export const NIVEAU_LABELS: Record<CommissionnaireNiveau, string> = {
  JUNIOR: "Junior",
  CONFIRME: "Confirmé",
  SENIOR: "Senior",
}

export const STATUT_COMMISSIONNAIRE_LABELS: Record<CommissionnaireStatut, string> = {
  ACTIF: "Actif",
  OBSERVATION: "Observation",
  SUSPENDU: "Suspendu",
  EXCLU: "Exclu",
}

export const CLASSEMENT_LABELS: Record<CommissionnaireClassement, string> = {
  ELITE: "Élite",
  TRES_PERFORMANT: "Très performant",
  MOYEN: "Moyen",
  RISQUE: "Risque",
}

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  RETARD: "Retard",
  DONNEES_INCOMPLETES: "Données incomplètes",
  NON_RESPECT_REGLES: "Non-respect des règles",
  AUTRE: "Autre",
}

export interface CommissionnaireIncident {
  idIncident: number
  idCommissionnaire: number
  type: IncidentType
  gravite: IncidentGravite
  description?: string | null
  impactDiscipline: number
  dateIncident: string
  createdBy?: number | null
  createdAt: string
}

export interface Commissionnaire {
  idCommissionnaire: number
  idPerson: number
  code: string
  zone?: string | null
  niveau: CommissionnaireNiveau
  statut: CommissionnaireStatut
  scorePerformance: number
  scoreQualite: number
  scoreDiscipline: number
  scoreEngagement: number
  scoreGlobal: number
  classement: CommissionnaireClassement
  dateDebutActivite?: string | null
  createdBy?: number | null
  person?: Person
  incidents?: CommissionnaireIncident[]
  createdAt: string
  updatedAt: string
}

export interface CommissionnaireCreatePayload {
  idPerson?: number
  fullName?: string
  phone?: string
  email?: string
  code: string
  zone?: string
  dateDebutActivite?: string
}

export interface CommissionnaireUpdatePayload {
  zone?: string
  dateDebutActivite?: string
  statut?: CommissionnaireStatut
}

export interface CommissionnaireScorePayload {
  scorePerformance?: number
  scoreQualite?: number
  scoreDiscipline?: number
  scoreEngagement?: number
}

export interface IncidentCreatePayload {
  type: IncidentType
  gravite?: IncidentGravite
  description?: string
  impactDiscipline?: number
}

export type MissionType = "COLLECTE_BIEN" | "APPORT_CLIENT" | "SUIVI"
export type MissionStatut = "SOUMISE" | "VALIDEE" | "REJETEE" | "CORRECTION_DEMANDEE"

export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  COLLECTE_BIEN: "Collecte de bien",
  APPORT_CLIENT: "Apport client",
  SUIVI: "Suivi",
}

export const MISSION_STATUT_LABELS: Record<MissionStatut, string> = {
  SOUMISE: "Soumise",
  VALIDEE: "Validée",
  REJETEE: "Rejetée",
  CORRECTION_DEMANDEE: "Correction demandée",
}

export interface Mission {
  idMission: number
  uuid: string
  idCommissionnaire: number
  type: MissionType
  statut: MissionStatut
  idProperty?: number | null
  idClient?: number | null
  notes?: string | null
  motifRejet?: string | null
  validatedBy?: number | null
  validatedAt?: string | null
  commissionnaire?: Commissionnaire
  property?: Property
  client?: Client
  createdAt: string
  updatedAt: string
}
