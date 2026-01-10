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
Property.hasOne(PropertyScore, { foreignKey: "idProperty" });
PropertyScore.belongsTo(Property, { foreignKey: "idProperty" });

// User - ActivityLog
ActivityLog.belongsTo(User, { foreignKey: "idUser" });
User.hasMany(ActivityLog, { foreignKey: "idUser" });

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
  syncModels,
};
