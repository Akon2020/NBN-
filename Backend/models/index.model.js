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

// User - Property
Property.belongsTo(User, { foreignKey: "idUserCreator" });
User.hasMany(Property, { foreignKey: "idUserCreator" });

// Property - Rental / Sale
Property.hasOne(RentalProperty, { foreignKey: "idProperty" });
RentalProperty.belongsTo(Property, { foreignKey: "idProperty" });

Property.hasOne(SaleProperty, { foreignKey: "idProperty" });
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
  syncModels,
};
