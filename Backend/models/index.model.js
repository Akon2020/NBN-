import db from "../database/db.js";

import User from "./user.model.js";
import Property from "./property.model.js";
import RentalProperty from "./rentalProperty.model.js";
import SaleProperty from "./saleProperty.model.js";
import PropertyImage from "./propertyImage.model.js";
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
EmployeeProfile.belongsTo(Person, { foreignKey: "idPerson" });

Service.hasMany(Poste, { foreignKey: "idService" });
Poste.belongsTo(Service, { foreignKey: "idService" });

Service.hasMany(EmployeeProfile, { foreignKey: "idService" });
EmployeeProfile.belongsTo(Service, { foreignKey: "idService" });

Poste.hasMany(EmployeeProfile, { foreignKey: "idPoste" });
EmployeeProfile.belongsTo(Poste, { foreignKey: "idPoste" });

EmployeeProfile.belongsTo(EmployeeProfile, {
  foreignKey: "idResponsable",
  as: "responsable",
});

// BACK-G06 — CRM : Client/Bailleur rattachés à Person (une même Person
// peut être Client ET Bailleur, CLAUDE.md §4).
Person.hasOne(Client, { foreignKey: "idPerson" });
Client.belongsTo(Person, { foreignKey: "idPerson", as: "person" });

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
  syncModels,
};
