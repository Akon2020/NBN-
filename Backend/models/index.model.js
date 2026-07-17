import db from "../database/db.js";

import User from "./user.model.js";
import Property from "./property.model.js";
import RentalProperty from "./rentalProperty.model.js";
import SaleProperty from "./saleProperty.model.js";
import PropertyImage from "./propertyImage.model.js";
import PropertyVideo from "./propertyVideo.model.js";
import PropertyPhone from "./propertyPhone.model.js";
import Favorite from "./favorite.model.js";
import Proposal from "./proposal.model.js";
import PropertyScore from "./propertyScore.model.js";
import ActivityLog from "./activityLog.model.js";
import Role from "./role.model.js";
import Permission from "./permission.model.js";
import RolePermission from "./rolePermission.model.js";
import AccessGrant from "./accessGrant.model.js";
import Session from "./session.model.js";
import Service from "./service.model.js";
import Poste from "./poste.model.js";
import Person from "./person.model.js";
import EmployeeProfile from "./employeeProfile.model.js";
import Client from "./client.model.js";
import Bailleur from "./bailleur.model.js";
import Matching from "./matching.model.js";
import Commissionnaire from "./commissionnaire.model.js";
import CommissionnaireIncident from "./commissionnaireIncident.model.js";
import Mission from "./mission.model.js";
import Currency from "./currency.model.js";
import Caisse from "./caisse.model.js";
import CaisseBalance from "./caisseBalance.model.js";
import ExchangeRate from "./exchangeRate.model.js";
import Requisition from "./requisition.model.js";
import PaymentMethod from "./paymentMethod.model.js";
import Payment from "./payment.model.js";
import CashMovement from "./cashMovement.model.js";
import LedgerEntry from "./ledgerEntry.model.js";
import Commission from "./commission.model.js";
import Task from "./task.model.js";
import TaskAssignee from "./taskAssignee.model.js";
import TaskPropertyLink from "./taskPropertyLink.model.js";
import TaskClientLink from "./taskClientLink.model.js";
import TaskBailleurLink from "./taskBailleurLink.model.js";
import TaskCommissionnaireLink from "./taskCommissionnaireLink.model.js";
import Notification from "./notification.model.js";
import Alert from "./alert.model.js";
import Reminder from "./reminder.model.js";
import OutboxEvent from "./outboxEvent.model.js";
import CalendarEvent from "./calendarEvent.model.js";
import Evaluation from "./evaluation.model.js";
import Objective from "./objective.model.js";
import Skill from "./skill.model.js";
import EmployeeSkill from "./employeeSkill.model.js";
import Training from "./training.model.js";
import EmployeeTraining from "./employeeTraining.model.js";
import TimelineEvent from "./timelineEvent.model.js";

// User - Property
// NB : corrigé en M2 (BACK-G05) — la FK réelle sur Property est
// `createdBy`, pas `idUserCreator` (bug préexistant, l'association était
// silencieusement cassée).
Property.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
User.hasMany(Property, { foreignKey: "createdBy", as: "createdProperties" });

Property.belongsTo(User, { foreignKey: "assignedTo", as: "assignee" });
User.hasMany(Property, { foreignKey: "assignedTo", as: "assignedProperties" });

// Property - Rental / Sale
// NB : alias explicites — sans `as`, Sequelize dérive un nom en minuscule
// (singularisation automatique du modèle) peu prévisible pour l'API.
Property.hasOne(RentalProperty, { foreignKey: "idProperty", as: "rentalDetails" });
RentalProperty.belongsTo(Property, { foreignKey: "idProperty" });

Property.hasOne(SaleProperty, { foreignKey: "idProperty", as: "saleDetails" });
SaleProperty.belongsTo(Property, { foreignKey: "idProperty" });

// Property - Images
Property.hasMany(PropertyImage, { foreignKey: "idProperty", as: "images" });
PropertyImage.belongsTo(Property, { foreignKey: "idProperty" });

Property.hasMany(PropertyVideo, { foreignKey: "idProperty", as: "videos" });
PropertyVideo.belongsTo(Property, { foreignKey: "idProperty" });

// Property - Phones
Property.hasMany(PropertyPhone, { foreignKey: "idProperty", as: "phones" });
PropertyPhone.belongsTo(Property, { foreignKey: "idProperty" });

// Favorites (Many-to-Many)
User.belongsToMany(Property, {
  through: Favorite,
  foreignKey: "idUser",
  otherKey: "idProperty",
});

Property.belongsToMany(User, {
  through: Favorite,
  foreignKey: "idProperty",
  otherKey: "idUser",
  as: "likedBy",
});

// Association directe sur le modèle de jointure lui-même — nécessaire pour
// pouvoir faire `Favorite.findAll({ include: Property })` (le
// belongsToMany ci-dessus ne crée des accesseurs que sur User/Property,
// pas sur Favorite).
Favorite.belongsTo(Property, { foreignKey: "idProperty" });
Favorite.belongsTo(User, { foreignKey: "idUser" });

// Property - Proposals
Property.hasMany(Proposal, { foreignKey: "idProperty" });
Proposal.belongsTo(Property, { foreignKey: "idProperty" });

// Property - Score
Property.hasOne(PropertyScore, { foreignKey: "idProperty", as: "scores" });
PropertyScore.belongsTo(Property, { foreignKey: "idProperty" });

// User - ActivityLog
ActivityLog.belongsTo(User, { foreignKey: "idUser" });
User.hasMany(ActivityLog, { foreignKey: "idUser" });

// BACK-G01 — User - Session
User.hasMany(Session, { foreignKey: "idUser" });
Session.belongsTo(User, { foreignKey: "idUser" });
Session.belongsTo(Session, { foreignKey: "replacedBySessionId", as: "replacedBy" });

// BACK-G02 — RBAC : Role - Permission (via RolePermission), User - AccessGrant
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: "idRole",
  otherKey: "idPermission",
  as: "permissions",
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: "idPermission",
  otherKey: "idRole",
  as: "roles",
});

User.hasMany(AccessGrant, { foreignKey: "idUser" });
AccessGrant.belongsTo(User, { foreignKey: "idUser" });
AccessGrant.belongsTo(User, { foreignKey: "grantedBy", as: "grantedByUser" });

// BACK-G04 — Organization : Person - User (0-1), Person - EmployeeProfile (0-1)
Person.belongsTo(User, { foreignKey: "idUser" });
User.hasOne(Person, { foreignKey: "idUser" });

Person.hasOne(EmployeeProfile, { foreignKey: "idPerson" });
EmployeeProfile.belongsTo(Person, { foreignKey: "idPerson", as: "person" });

Service.hasMany(Poste, { foreignKey: "idService" });
Poste.belongsTo(Service, { foreignKey: "idService" });

Service.hasMany(EmployeeProfile, { foreignKey: "idService" });
EmployeeProfile.belongsTo(Service, { foreignKey: "idService", as: "service" });

Poste.hasMany(EmployeeProfile, { foreignKey: "idPoste" });
EmployeeProfile.belongsTo(Poste, { foreignKey: "idPoste", as: "poste" });

EmployeeProfile.belongsTo(EmployeeProfile, {
  foreignKey: "idResponsable",
  as: "responsable",
});

// BACK-G06 — CRM : Client/Bailleur rattachés à Person (une même Person
// peut être Client ET Bailleur, CLAUDE.md §4).
Person.hasOne(Client, { foreignKey: "idPerson" });
Client.belongsTo(Person, { foreignKey: "idPerson", as: "person" });

// GOAL 4 — le code commissionnaire est la référence métier (jamais un
// idCommissionnaire interne saisi/affiché) ; association basée sur cette
// colonne unique plutôt qu'une simple jointure manuelle côté contrôleur,
// pour bénéficier du même mécanisme d'`include` que le reste du modèle.
Client.belongsTo(Commissionnaire, {
  foreignKey: "sourceCommissionnaireCode",
  targetKey: "code",
  as: "commissionnaireSource",
  constraints: false,
});

Person.hasOne(Bailleur, { foreignKey: "idPerson" });
Bailleur.belongsTo(Person, { foreignKey: "idPerson", as: "person" });

// Biens associés à un bailleur (CDC §3 — lien direct avec le module biens).
Bailleur.hasMany(Property, { foreignKey: "idBailleur" });
Property.belongsTo(Bailleur, { foreignKey: "idBailleur" });

// BACK-G07 — une proposition envoyée à un Client réel (remplace les
// champs clientName/clientPhone jamais activés).
Client.hasMany(Proposal, { foreignKey: "idClient" });
Proposal.belongsTo(Client, { foreignKey: "idClient" });

// BACK-G08 — Matching : 1 client ↔ plusieurs biens.
Client.belongsToMany(Property, {
  through: Matching,
  foreignKey: "idClient",
  otherKey: "idProperty",
  as: "matchedProperties",
});
Property.belongsToMany(Client, {
  through: Matching,
  foreignKey: "idProperty",
  otherKey: "idClient",
  as: "matchedClients",
});

// Association directe sur le modèle de jointure lui-même — même raison que
// pour Favorite ci-dessus : le belongsToMany seul ne permet pas
// `Matching.findAll({ include: Property })`.
Matching.belongsTo(Property, { foreignKey: "idProperty" });
Matching.belongsTo(Client, { foreignKey: "idClient" });

// BACK-G09 — Commissionnaire rattaché à Person (peut ou non avoir un User,
// CLAUDE.md §4), fiche digitale (CDC §7).
Person.hasOne(Commissionnaire, { foreignKey: "idPerson" });
Commissionnaire.belongsTo(Person, { foreignKey: "idPerson", as: "person" });
Commissionnaire.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

Commissionnaire.hasMany(CommissionnaireIncident, {
  foreignKey: "idCommissionnaire",
  as: "incidents",
});
CommissionnaireIncident.belongsTo(Commissionnaire, { foreignKey: "idCommissionnaire" });
CommissionnaireIncident.belongsTo(User, { foreignKey: "createdBy", as: "reporter" });

// BACK-G10 — Missions terrain (collecte de bien, apport client, suivi).
Commissionnaire.hasMany(Mission, { foreignKey: "idCommissionnaire", as: "missions" });
Mission.belongsTo(Commissionnaire, { foreignKey: "idCommissionnaire", as: "commissionnaire" });
Mission.belongsTo(Property, { foreignKey: "idProperty" });
Mission.belongsTo(Client, { foreignKey: "idClient" });
Mission.belongsTo(User, { foreignKey: "validatedBy", as: "validator" });

// BACK-G12 — Caisses multiples et devises (CLAUDE.md §4). Un solde par
// devise et par caisse (CaisseBalance), jamais mélangés ; ExchangeRate sert
// uniquement au reporting consolidé.
Caisse.belongsTo(User, { foreignKey: "responsableUserId", as: "responsable" });
Caisse.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

Caisse.hasMany(CaisseBalance, { foreignKey: "idCaisse", as: "balances" });
CaisseBalance.belongsTo(Caisse, { foreignKey: "idCaisse" });

Currency.hasMany(CaisseBalance, { foreignKey: "currencyCode" });
CaisseBalance.belongsTo(Currency, { foreignKey: "currencyCode", as: "currency" });

ExchangeRate.belongsTo(Currency, { foreignKey: "fromCurrency", as: "from" });
ExchangeRate.belongsTo(Currency, { foreignKey: "toCurrency", as: "to" });
ExchangeRate.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

// BACK-G13 — Réquisitions (info.md §6 : Saisie → Vérification →
// Approbation → Génération → Archivage).
Requisition.belongsTo(User, { foreignKey: "demandeurId", as: "demandeur" });
Requisition.belongsTo(User, { foreignKey: "decidedBy", as: "decideur" });
Requisition.belongsTo(Caisse, { foreignKey: "idCaisse", as: "caisse" });
Requisition.belongsTo(Currency, { foreignKey: "currencyCode", as: "currency" });

// BACK-G14 — Payment → CashMovement → LedgerEntry (CLAUDE.md §4, append-only).
Payment.belongsTo(Caisse, { foreignKey: "idCaisse", as: "caisse" });
Payment.belongsTo(Currency, { foreignKey: "currencyCode", as: "currency" });
Payment.belongsTo(PaymentMethod, { foreignKey: "idPaymentMethod", as: "paymentMethod" });
Payment.belongsTo(Requisition, { foreignKey: "idRequisition", as: "requisition" });
Payment.belongsTo(User, { foreignKey: "recordedBy", as: "recorder" });
Payment.belongsTo(Payment, { foreignKey: "reversalOfPaymentId", as: "reversalOf" });
Payment.hasOne(Payment, { foreignKey: "reversalOfPaymentId", as: "reversedBy" });

CashMovement.belongsTo(Caisse, { foreignKey: "idCaisse", as: "caisse" });
CashMovement.belongsTo(Currency, { foreignKey: "currencyCode", as: "currency" });
CashMovement.belongsTo(Payment, { foreignKey: "idPayment", as: "payment" });
CashMovement.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
Payment.hasOne(CashMovement, { foreignKey: "idPayment", as: "cashMovement" });

LedgerEntry.belongsTo(Caisse, { foreignKey: "idCaisse", as: "caisse" });
LedgerEntry.belongsTo(Currency, { foreignKey: "currencyCode", as: "currency" });
LedgerEntry.belongsTo(CashMovement, { foreignKey: "idCashMovement", as: "cashMovement" });
LedgerEntry.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
CashMovement.hasOne(LedgerEntry, { foreignKey: "idCashMovement", as: "ledgerEntry" });

// BACK-G15 — Commission calculée à partir d'une transaction conclue (CDC),
// éligible à un Payment une fois marquée DUE (même circuit que Requisition).
Commission.belongsTo(Client, { foreignKey: "idClient", as: "client" });
Commission.belongsTo(Property, { foreignKey: "idProperty", as: "property" });
Commission.belongsTo(User, { foreignKey: "beneficiaireUserId", as: "beneficiaireUser" });
Commission.belongsTo(Commissionnaire, { foreignKey: "idCommissionnaire", as: "commissionnaire" });
Commission.belongsTo(Currency, { foreignKey: "currencyCode", as: "currency" });
Commission.belongsTo(Caisse, { foreignKey: "idCaisse", as: "caisse" });
Commission.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

Payment.belongsTo(Commission, { foreignKey: "idCommission", as: "commission" });

// BACK-G16 — module Tasks générique (Kanban). Tables de liaison explicites
// par type (CLAUDE.md §4), jamais de relation polymorphe. Le statut d'une
// Task ne pilote jamais l'état métier d'une ressource liée.
Task.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

Task.hasMany(TaskAssignee, { foreignKey: "idTask", as: "assignees" });
TaskAssignee.belongsTo(Task, { foreignKey: "idTask" });
TaskAssignee.belongsTo(User, { foreignKey: "idUser", as: "user" });

Task.hasMany(TaskPropertyLink, { foreignKey: "idTask", as: "propertyLinks" });
TaskPropertyLink.belongsTo(Task, { foreignKey: "idTask" });
TaskPropertyLink.belongsTo(Property, { foreignKey: "idProperty", as: "property" });

Task.hasMany(TaskClientLink, { foreignKey: "idTask", as: "clientLinks" });
TaskClientLink.belongsTo(Task, { foreignKey: "idTask" });
TaskClientLink.belongsTo(Client, { foreignKey: "idClient", as: "client" });

Task.hasMany(TaskBailleurLink, { foreignKey: "idTask", as: "bailleurLinks" });
TaskBailleurLink.belongsTo(Task, { foreignKey: "idTask" });
TaskBailleurLink.belongsTo(Bailleur, { foreignKey: "idBailleur", as: "bailleur" });

Task.hasMany(TaskCommissionnaireLink, { foreignKey: "idTask", as: "commissionnaireLinks" });
TaskCommissionnaireLink.belongsTo(Task, { foreignKey: "idTask" });
TaskCommissionnaireLink.belongsTo(Commissionnaire, {
  foreignKey: "idCommissionnaire",
  as: "commissionnaire",
});

// BACK-G17 — Notifications/Alerts/Reminders (CLAUDE.md §4/§7).
Notification.belongsTo(User, { foreignKey: "idUser", as: "user" });
User.hasMany(Notification, { foreignKey: "idUser" });

Alert.belongsTo(User, { foreignKey: "assignedTo", as: "assignee" });
Alert.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
Alert.belongsTo(User, { foreignKey: "resolvedBy", as: "resolver" });

Reminder.belongsTo(User, { foreignKey: "idUser", as: "user" });
Reminder.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

// BACK-G19 — Calendrier agrégé (vue seulement ; CalendarEvent propre
// uniquement pour un rendez-vous sans source ailleurs, CLAUDE.md §4).
CalendarEvent.belongsTo(User, { foreignKey: "idUser", as: "owner" });
CalendarEvent.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

// BACK-G22 — RH avancé (évaluations, objectifs, compétences, formations),
// tout rattaché à EmployeeProfile (jamais à User directement, CLAUDE.md §4
// — un employé peut ne pas avoir de compte de connexion).
Evaluation.belongsTo(EmployeeProfile, { foreignKey: "idEmployeeProfile", as: "employeeProfile" });
EmployeeProfile.hasMany(Evaluation, { foreignKey: "idEmployeeProfile" });
Evaluation.belongsTo(User, { foreignKey: "evaluatorUserId", as: "evaluator" });

Objective.belongsTo(EmployeeProfile, { foreignKey: "idEmployeeProfile", as: "employeeProfile" });
EmployeeProfile.hasMany(Objective, { foreignKey: "idEmployeeProfile" });
Objective.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

EmployeeSkill.belongsTo(EmployeeProfile, { foreignKey: "idEmployeeProfile", as: "employeeProfile" });
EmployeeProfile.hasMany(EmployeeSkill, { foreignKey: "idEmployeeProfile", as: "employeeSkills" });
EmployeeSkill.belongsTo(Skill, { foreignKey: "idSkill", as: "skill" });
Skill.hasMany(EmployeeSkill, { foreignKey: "idSkill" });

EmployeeTraining.belongsTo(EmployeeProfile, { foreignKey: "idEmployeeProfile", as: "employeeProfile" });
EmployeeProfile.hasMany(EmployeeTraining, { foreignKey: "idEmployeeProfile", as: "employeeTrainings" });
EmployeeTraining.belongsTo(Training, { foreignKey: "idTraining", as: "training" });
Training.hasMany(EmployeeTraining, { foreignKey: "idTraining" });

// GOAL 3 — Timeline (soft reference volontaire vers entityType/entityId,
// voir le commentaire du modèle).
TimelineEvent.belongsTo(User, { foreignKey: "actorUserId", as: "actor" });

const syncModels = async () => {
  try {
    await db.sync({ alter: false });
    console.log("Modèles synchronisés avec succès");
  } catch (error) {
    console.error("Erreur lors de la synchronisation des modèles:", error);
    throw error;
  }
};

export {
  User,
  Property,
  RentalProperty,
  SaleProperty,
  PropertyImage,
  PropertyVideo,
  PropertyPhone,
  Favorite,
  Proposal,
  PropertyScore,
  ActivityLog,
  Role,
  Permission,
  RolePermission,
  AccessGrant,
  Session,
  Service,
  Poste,
  Person,
  EmployeeProfile,
  Client,
  Bailleur,
  Matching,
  Commissionnaire,
  CommissionnaireIncident,
  Mission,
  Currency,
  Caisse,
  CaisseBalance,
  ExchangeRate,
  Requisition,
  PaymentMethod,
  Payment,
  CashMovement,
  LedgerEntry,
  Commission,
  Task,
  TaskAssignee,
  TaskPropertyLink,
  TaskClientLink,
  TaskBailleurLink,
  TaskCommissionnaireLink,
  Notification,
  Alert,
  Reminder,
  OutboxEvent,
  CalendarEvent,
  Evaluation,
  Objective,
  Skill,
  EmployeeSkill,
  Training,
  EmployeeTraining,
  TimelineEvent,
  syncModels,
};
