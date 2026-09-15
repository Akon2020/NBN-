import { Op } from "sequelize";
import { User } from "../models/index.model.js";
import { createNotification } from "./notification.service.js";
import { queueEmail } from "./email.service.js";
import {
  FRONT_URL,
  NOTIFY_RENTAL_REQUEST_ROLES,
  NOTIFY_PROPERTY_COLLECTION_ROLES,
} from "../config/env.js";
import {
  propertyCollectionConfirmation,
  propertyCollectionTeamEmail,
  rentalRequestAcknowledgement,
  rentalRequestTeamEmail,
} from "../utils/formEmail.templates.js";

// Qui est prévenu, sur le site ET par e-mail, quand un formulaire public
// est soumis. Rôles configurables, défauts documentés (.env.example).
const roleList = (value, fallback) => {
  const roles = String(value ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
  return roles.length ? roles : fallback;
};

const RENTAL_REQUEST_ROLES = roleList(NOTIFY_RENTAL_REQUEST_ROLES, [
  "admin",
  "communication",
  "marketing",
  "operations",
]);
const PROPERTY_COLLECTION_ROLES = roleList(NOTIFY_PROPERTY_COLLECTION_ROLES, ["admin", "operations"]);

const dashboardLink = (path) => `${(FRONT_URL || "").replace(/\/$/, "")}${path}`;

const findTeam = (roles) =>
  User.findAll({
    where: { role: { [Op.in]: roles }, status: "ACTIVE" },
    attributes: ["idUser", "email", "fullName"],
  });

// Une Notification (cloche du site, push mobile) et un e-mail par membre.
const notifyTeam = async (roles, { notification, email }) => {
  const team = await findTeam(roles);
  for (const user of team) {
    await createNotification({ idUser: user.idUser, ...notification });
    await queueEmail({ to: user.email, ...email });
  }
  return team.length;
};

export const notifyRentalRequest = async ({ rentalRequest, client }) => {
  const orderNumber = client.dossierNumber;
  const localisation = [rentalRequest.commune, rentalRequest.quartier, rentalRequest.avenues]
    .filter(Boolean)
    .join(" — ");
  const budget = `${Number(rentalRequest.budgetMin).toLocaleString("fr-FR")} à ${Number(
    rentalRequest.loyerMax
  ).toLocaleString("fr-FR")} ${rentalRequest.devise}`;

  // L'avis de réception part depuis contact@ quand la boîte est configurée :
  // une réponse du client arrive ainsi directement chez l'équipe.
  await queueEmail({
    to: rentalRequest.email,
    mailboxKey: "contact",
    ...rentalRequestAcknowledgement({
      fullName: rentalRequest.fullName,
      sexe: rentalRequest.sexe,
      orderNumber,
      requestedAt: rentalRequest.createdAt ?? new Date(),
    }),
  });

  return notifyTeam(RENTAL_REQUEST_ROLES, {
    notification: {
      type: "rental_request:new",
      title: `Nouvelle demande de location — ${rentalRequest.fullName}`,
      message: [localisation, budget].filter(Boolean).join(" · "),
      relatedEntityType: "Client",
      relatedEntityId: client.idClient,
    },
    email: rentalRequestTeamEmail({
      fullName: rentalRequest.fullName,
      phone: rentalRequest.phone,
      email: rentalRequest.email,
      localisation,
      budget,
      orderNumber,
      link: dashboardLink(`/dashboard/clients/${client.idClient}`),
    }),
  });
};

export const notifyPropertyCollection = async ({ property, responsable, source, parResponsable }) => {
  const localisation = [property.propertyType, property.commune, property.quartier, property.avenue]
    .filter(Boolean)
    .join(" — ");
  const title = `Nouveau bien collecté — ${property.propertyType} à ${property.quartier || property.commune}`;
  const detailPath = property.category === "SALE" ? "sales" : "rentals";

  if (parResponsable && responsable.email) {
    await queueEmail({
      to: responsable.email,
      mailboxKey: "contact",
      ...propertyCollectionConfirmation({
        fullName: responsable.fullName,
        localisation,
        requestedAt: property.createdAt ?? new Date(),
      }),
    });
  }

  return notifyTeam(PROPERTY_COLLECTION_ROLES, {
    notification: {
      // Le suffixe permet au dashboard d'ouvrir la bonne fiche (location/vente).
      type: `property_collection:new:${property.category === "SALE" ? "sale" : "rent"}`,
      title,
      message: `${source} · ${localisation}`,
      relatedEntityType: "Property",
      relatedEntityId: property.idProperty,
    },
    email: propertyCollectionTeamEmail({
      title,
      source,
      localisation,
      price: `${Number(property.price).toLocaleString("fr-FR")} $`,
      responsable: `${responsable.fullName} (${responsable.phone})`,
      link: dashboardLink(`/dashboard/${detailPath}/${property.idProperty}`),
    }),
  });
};
