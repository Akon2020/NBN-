export type PropertyCategory = "RENT" | "SALE"

export type PropertyType =
  | "APPARTEMENT"
  | "MAISON"
  | "CONSTRUCTION_DURABLE"
  | "CONSTRUCTION_SEMI_DURABLE"
  | "TERRAIN_PLAT"
  | "TERRAIN_PENTE"

// GOAL 1 — cycle de vie du bien. VENDU n'est atteignable qu'en category=SALE
// (validé côté Backend, jamais côté client).
export type PropertyStatut =
  | "DISPONIBLE"
  | "OCCUPE_CLIENT_NBN"
  | "OCCUPE_CLIENT_EXTERNE"
  | "EN_MAINTENANCE"
  | "VENDU"

export const PROPERTY_STATUT_LABELS: Record<PropertyStatut, string> = {
  DISPONIBLE: "Disponible",
  OCCUPE_CLIENT_NBN: "Occupé (client NBN)",
  OCCUPE_CLIENT_EXTERNE: "Occupé (client externe)",
  EN_MAINTENANCE: "En maintenance",
  VENDU: "Vendu",
}

export const PROPERTY_STATUT_BADGE_CLASS: Record<PropertyStatut, string> = {
  DISPONIBLE: "bg-success-500 text-white",
  OCCUPE_CLIENT_NBN: "bg-primary-900 text-white",
  OCCUPE_CLIENT_EXTERNE: "bg-secondary-600 text-white",
  EN_MAINTENANCE: "bg-warning-500 text-neutral-900",
  VENDU: "bg-neutral-600 text-white",
}

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
  order: number
}

// GOAL 2 — vidéos de bien, jamais mélangées avec PropertyImageEntry (table
// dédiée côté Backend, contraintes de format/taille différentes).
export interface PropertyVideoEntry {
  idPropertyVideo: number
  idProperty: number
  video: string
  order: number
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
  videos?: PropertyVideoEntry[]
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
  // GOAL 4 — résolu côté Backend via l'association sur le code unique
  // (jamais reconstruit à la main côté Frontend à partir du code seul).
  commissionnaireSource?: {
    idCommissionnaire: number
    code: string
    person?: { fullName: string }
  } | null
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
  sourceCommissionnaireCode?: string
}

export interface ClientUpdatePayload {
  sousType?: ClientSousType
  source?: ClientSource
  // GOAL 4 — code du commissionnaire à l'origine du client (référence
  // métier, jamais un idCommissionnaire interne). `null` retire
  // explicitement l'attribution, `undefined` laisse le champ inchangé.
  sourceCommissionnaireCode?: string | null
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

// --- Milestone 4 : Trésorerie (BACK-G12 à G15) ---

export interface Currency {
  code: string
  label: string
  symbol: string
  isActive: boolean
}

export interface CaisseBalance {
  idCaisseBalance: number
  idCaisse: number
  currencyCode: string
  balance: number
  currency?: Currency
}

export type CaisseStatut = "OUVERTE" | "CLOTUREE"

export const CAISSE_STATUT_LABELS: Record<CaisseStatut, string> = {
  OUVERTE: "Ouverte",
  CLOTUREE: "Clôturée",
}

export interface Caisse {
  idCaisse: number
  label: string
  responsableUserId?: number | null
  statut: CaisseStatut
  responsable?: { idUser: number; fullName: string; email: string } | null
  balances?: CaisseBalance[]
  createdAt: string
}

export interface ExchangeRate {
  idExchangeRate: number
  fromCurrency: string
  toCurrency: string
  rate: number
  date: string
  source?: string | null
  from?: Currency
  to?: Currency
}

export type RequisitionStatut = "SOUMISE" | "COMPLEMENT_DEMANDE" | "APPROUVEE" | "REJETEE"

export const REQUISITION_STATUT_LABELS: Record<RequisitionStatut, string> = {
  SOUMISE: "Soumise",
  COMPLEMENT_DEMANDE: "Complément demandé",
  APPROUVEE: "Approuvée",
  REJETEE: "Rejetée",
}

export interface Requisition {
  idRequisition: number
  demandeurId: number
  idCaisse: number
  nature: string
  quantite?: number | null
  coutEstime: number
  currencyCode: string
  justificatif?: string | null
  statut: RequisitionStatut
  motifDecision?: string | null
  validationCode?: string | null
  decidedBy?: number | null
  decidedAt?: string | null
  demandeur?: { idUser: number; fullName: string; email: string }
  decideur?: { idUser: number; fullName: string; email: string } | null
  caisse?: { idCaisse: number; label: string }
  currency?: Currency
  createdAt: string
}

export interface RequisitionCreatePayload {
  idCaisse: number
  nature: string
  quantite?: number
  coutEstime: number
  currencyCode: string
  justificatif?: string
}

export interface PaymentMethod {
  idPaymentMethod: number
  code: string
  label: string
  isActive: boolean
}

export type PaymentType = "ENCAISSEMENT" | "DECAISSEMENT"
export type PaymentStatut =
  | "recorded_manually"
  | "initiated"
  | "provider_confirmed"
  | "pending"
  | "failed"
  | "cancelled"
  | "reconciled"

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  ENCAISSEMENT: "Encaissement",
  DECAISSEMENT: "Décaissement",
}

export interface Payment {
  idPayment: number
  type: PaymentType
  amount: number
  currencyCode: string
  idCaisse: number
  idPaymentMethod: number
  idRequisition?: number | null
  idCommission?: number | null
  statut: PaymentStatut
  description?: string | null
  reversalOfPaymentId?: number | null
  recordedBy: number
  caisse?: { idCaisse: number; label: string }
  currency?: Currency
  paymentMethod?: PaymentMethod
  requisition?: { idRequisition: number; nature: string } | null
  commission?: { idCommission: number; montantCommission: number } | null
  recorder?: { idUser: number; fullName: string }
  createdAt: string
}

export interface PaymentCreatePayload {
  type: PaymentType
  amount: number
  currencyCode: string
  idCaisse: number
  idPaymentMethod: number
  idRequisition?: number
  idCommission?: number
  description?: string
}

export interface LedgerEntry {
  idLedgerEntry: number
  idCaisse: number
  currencyCode: string
  amount: number
  type: "ENTREE" | "SORTIE"
  balanceAfter: number
  idCashMovement: number
  description?: string | null
  caisse?: { idCaisse: number; label: string }
  currency?: Currency
  creator?: { idUser: number; fullName: string }
  createdAt: string
}

export type CommissionBeneficiaireType = "AGENCE" | "AGENT" | "COMMISSIONNAIRE"
export type CommissionStatut = "CALCULEE" | "DUE" | "PAYEE" | "ANNULEE"

export const COMMISSION_BENEFICIAIRE_LABELS: Record<CommissionBeneficiaireType, string> = {
  AGENCE: "Agence",
  AGENT: "Agent",
  COMMISSIONNAIRE: "Commissionnaire",
}

export const COMMISSION_STATUT_LABELS: Record<CommissionStatut, string> = {
  CALCULEE: "Calculée",
  DUE: "Due",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
}

export interface Commission {
  idCommission: number
  idClient: number
  idProperty?: number | null
  beneficiaireType: CommissionBeneficiaireType
  beneficiaireUserId?: number | null
  idCommissionnaire?: number | null
  montantTransaction: number
  currencyCode: string
  tauxCommission?: number | null
  montantCommission: number
  idCaisse?: number | null
  statut: CommissionStatut
  client?: { idClient: number; type: string; statutPipeline: string }
  property?: { idProperty: number; quartier?: string; price?: number } | null
  beneficiaireUser?: { idUser: number; fullName: string } | null
  commissionnaire?: { idCommissionnaire: number; code: string; person?: { fullName: string } } | null
  currency?: Currency
  caisse?: { idCaisse: number; label: string } | null
  createdAt: string
}

export interface CommissionCreatePayload {
  idClient: number
  idProperty?: number
  beneficiaireType: CommissionBeneficiaireType
  beneficiaireUserId?: number
  montantTransaction: number
  currencyCode: string
  tauxCommission?: number
  montantCommission?: number
}

// --- Milestone 5 : Notifications/Alerts/Realtime (ADMIN-G07 — BACK-G17/G18) ---

export interface Notification {
  idNotification: number
  idUser: number
  type: string
  title: string
  message?: string | null
  relatedEntityType?: string | null
  relatedEntityId?: number | null
  isRead: boolean
  readAt?: string | null
  pushStatus: "PENDING" | "SENT" | "FAILED" | "SKIPPED"
  createdAt: string
}

export type AlertStatut = "OUVERTE" | "RECONNUE" | "ASSIGNEE" | "EN_COURS" | "RESOLUE" | "CLOTUREE"
export type AlertSeverite = "INFO" | "AVERTISSEMENT" | "CRITIQUE"

export const ALERT_STATUT_LABELS: Record<AlertStatut, string> = {
  OUVERTE: "Ouverte",
  RECONNUE: "Reconnue",
  ASSIGNEE: "Assignée",
  EN_COURS: "En cours",
  RESOLUE: "Résolue",
  CLOTUREE: "Clôturée",
}

export const ALERT_SEVERITE_LABELS: Record<AlertSeverite, string> = {
  INFO: "Info",
  AVERTISSEMENT: "Avertissement",
  CRITIQUE: "Critique",
}

export interface Alert {
  idAlert: number
  type: string
  title: string
  description?: string | null
  severite: AlertSeverite
  statut: AlertStatut
  assignee?: { idUser: number; fullName: string } | null
  creator?: { idUser: number; fullName: string } | null
  resolver?: { idUser: number; fullName: string } | null
  createdAt: string
  resolvedAt?: string | null
}

// --- Milestone 6 : Calendrier agrégé (ADMIN-G08 — BACK-G19) ---
// Vue agrégée uniquement (CLAUDE.md §4) : chaque entrée référence sa
// source d'origine, jamais une copie de son statut.
export type CalendarSource = "TASK" | "REMINDER" | "RELANCE_CLIENT" | "EVENT"

export interface CalendarEntry {
  source: CalendarSource
  id: number
  title: string
  description?: string | null
  date: string
  endDate?: string | null
  statut?: string | null
  priorite?: string | null
  creator?: string | null
}

export const CALENDAR_SOURCE_LABELS: Record<CalendarSource, string> = {
  TASK: "Tâche",
  REMINDER: "Rappel",
  RELANCE_CLIENT: "Relance client",
  EVENT: "Rendez-vous",
}

// --- ADMIN-G00 : statistiques réelles du tableau de bord ---
// Chaque champ est optionnel : le Backend ne renvoie un bloc que si
// l'utilisateur a la permission de lire le domaine correspondant (jamais
// de logique d'autorisation dupliquée côté Frontend, CLAUDE.md §2.2).
export type RecentActivityType = "PROPERTY" | "CLIENT" | "MISSION" | "REQUISITION"

export interface RecentActivityEntry {
  type: RecentActivityType
  id: number
  label: string
  detail?: string | null
  date: string
}

// --- GOAL 3 : Timeline complète ---
export type TimelineEntityType = "PROPERTY" | "CLIENT" | "COMMISSIONNAIRE" | "BAILLEUR"

export interface TimelineEvent {
  idTimelineEvent: number
  entityType: TimelineEntityType
  entityId: number
  eventType: string
  title: string
  description?: string | null
  metadata?: Record<string, unknown> | null
  actor?: { idUser: number; fullName: string } | null
  occurredAt: string
}

export interface DashboardStats {
  properties: { rentals: number; sales: number; totalImages: number }
  favorites: number
  clients?: number
  proposals?: number
  activeUsers?: number
  pendingMissions?: number
  pendingRequisitions?: number
  openCaisses?: number
  pendingCommissions?: number
  recentActivity: RecentActivityEntry[]
}
