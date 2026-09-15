import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Op } from "sequelize";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Person,
  Client,
  RentalRequest,
  Property,
  RentalProperty,
  PropertyPhone,
  Bailleur,
  Notification,
  OutboxEvent,
  Alert,
  TimelineEvent,
} from "../models/index.model.js";
import { escapeHtml, rentalRequestAcknowledgement } from "../utils/formEmail.templates.js";

const suffix = Date.now();
const users = {};
const created = { requests: [], clients: [], persons: [], properties: [] };
const clientEmail = `client.notif.${suffix}@gmail.com`;
const clientPhone = `+24397${String(suffix).slice(-7)}`;
const ownerPhone = `+24393${String(suffix).slice(-7)}`;

const emailEventsTo = async (to) => {
  const events = await OutboxEvent.findAll({
    where: { eventType: "email:send", payload: { [Op.like]: `%"to":"${to}"%` } },
  });
  return events.map((event) => ({ event, payload: JSON.parse(event.payload) }));
};

beforeAll(async () => {
  const hashed = await bcrypt.hash("TestPass@123", await bcrypt.genSalt());
  for (const role of ["communication", "operations", "tresorerie"]) {
    users[role] = await User.create({
      fullName: `${role} notif ${suffix}`,
      email: `${role}.notif.${suffix}@nbn.test`,
      password: hashed,
      role,
      status: "ACTIVE",
    });
  }
});

afterAll(async () => {
  const userIds = Object.values(users).map((user) => user.idUser);
  const emails = [clientEmail, ...Object.values(users).map((user) => user.email)];
  for (const to of emails) {
    const events = await emailEventsTo(to);
    await OutboxEvent.destroy({ where: { idOutboxEvent: events.map(({ event }) => event.idOutboxEvent) } });
  }
  await Notification.destroy({ where: { idUser: userIds } });

  if (created.properties.length) {
    await TimelineEvent.destroy({ where: { entityType: "PROPERTY", entityId: created.properties } });
    await Alert.destroy({ where: { relatedEntityType: "Property", relatedEntityId: created.properties } });
    await PropertyPhone.destroy({ where: { idProperty: created.properties } });
    await RentalProperty.destroy({ where: { idProperty: created.properties } });
    await Property.destroy({ where: { idProperty: created.properties }, force: true });
  }
  const owner = await Person.findOne({ where: { phone: ownerPhone } });
  if (owner) {
    await Bailleur.destroy({ where: { idPerson: owner.idPerson } });
    await owner.destroy();
  }
  if (created.requests.length) await RentalRequest.destroy({ where: { idRentalRequest: created.requests } });
  if (created.clients.length) {
    await TimelineEvent.destroy({ where: { entityType: "CLIENT", entityId: created.clients } });
    await Alert.destroy({ where: { relatedEntityType: "Client", relatedEntityId: created.clients } });
    await Client.destroy({ where: { idClient: created.clients }, force: true });
  }
  if (created.persons.length) await Person.destroy({ where: { idPerson: created.persons } });
  await User.destroy({ where: { idUser: userIds } });
});

describe("Avis de réception", () => {
  it("reprend le texte de l'agence avec les variables du client", () => {
    const { subject, html, text } = rentalRequestAcknowledgement({
      fullName: "Jeanne Mukendi",
      sexe: "FEMININ",
      orderNumber: "CLI-2026-000042",
      requestedAt: new Date("2026-09-15T10:30:00Z"),
    });

    expect(subject).toBe("Avis de réception de votre demande");
    expect(text).toContain("Bonjour Madame Jeanne Mukendi,");
    expect(text).toContain("votre commande a bien été reçue par NBN Express");
    expect(text).toContain("N° de commande : CLI-2026-000042");
    // Heure de Bukavu (UTC+2), pas celle du serveur.
    expect(text).toContain("15 septembre 2026 à 12:30");
    expect(html).toContain("La crédibilité au service de votre projet immobilier");
  });

  it("échappe le nom saisi par le visiteur", () => {
    const { html } = rentalRequestAcknowledgement({
      fullName: `<a href="https://pirate.example">clic</a>`,
      requestedAt: new Date(),
    });
    expect(html).not.toContain(`<a href="https://pirate.example">`);
    expect(html).toContain(escapeHtml(`<a href="https://pirate.example">`));
  });
});

describe("Notifications des formulaires publics", () => {
  it("une demande de location envoie l'avis au client et prévient l'équipe commerciale", async () => {
    const res = await request(app).post("/api/rental-requests").send({
      fullName: `Client Notif ${suffix}`,
      phone: clientPhone,
      email: clientEmail,
      sexe: "MASCULIN",
      canalContact: "WHATSAPP",
      typesBien: ["APPARTEMENT"],
      usageBien: "HABITATION",
      ville: "BUKAVU",
      commune: "IBANDA",
      quartier: "Panzi",
      avenues: "Kasiye",
      budgetMin: 100,
      loyerMax: 250,
      modalitePaiement: "AVANCE_1_GARANTIE_3",
      urgence: "IMMEDIAT",
      typeOccupants: "COUPLE",
      elementsParticuliers: ["AUCUNE"],
      orienteParAgent: false,
      conditionsAccepted: true,
    });
    expect(res.status).toBe(201);
    created.requests.push(res.body.data.idRentalRequest);
    const stored = await RentalRequest.findByPk(res.body.data.idRentalRequest);
    const client = await Client.findByPk(stored.idClient);
    created.clients.push(client.idClient);
    created.persons.push(client.idPerson);

    const [acknowledgement] = await emailEventsTo(clientEmail);
    expect(acknowledgement.payload.subject).toBe("Avis de réception de votre demande");
    expect(acknowledgement.payload.mailboxKey).toBe("contact");
    expect(acknowledgement.payload.text).toContain(`Bonjour Monsieur Client Notif ${suffix}`);
    expect(acknowledgement.payload.text).toContain(client.dossierNumber);

    // Communication et opérations : cloche du site ET e-mail. Trésorerie : rien.
    for (const role of ["communication", "operations"]) {
      const notification = await Notification.findOne({
        where: { idUser: users[role].idUser, type: "rental_request:new" },
      });
      expect(notification?.relatedEntityId).toBe(client.idClient);
      expect(await emailEventsTo(users[role].email)).toHaveLength(1);
    }
    expect(
      await Notification.count({ where: { idUser: users.tresorerie.idUser, type: "rental_request:new" } })
    ).toBe(0);
    expect(await emailEventsTo(users.tresorerie.email)).toHaveLength(0);
  });

  it("une collecte de bien prévient les opérations, avec un lien vers la bonne fiche", async () => {
    const res = await request(app).post("/api/property-collections").send({
      remplisseur: "COLLECTEUR",
      parCommissionnaire: false,
      typeMission: "COLLECTE_BIEN",
      typeOperation: "SALE",
      propertyType: "MAISON",
      commune: "BAGIRA",
      quartier: "Cahi",
      avenue: "Risasi",
      prix: "45000",
      bedrooms: "4",
      toilets: "2",
      livingRooms: "1",
      kitchens: "1",
      depots: "1",
      responsableStatut: "PROPRIETAIRE",
      responsableNom: `Proprietaire Notif ${suffix}`,
      responsablePhone: ownerPhone,
      responsableDisponibiliteVisite: "OUI",
      responsableAccepteCommission: "OUI",
    });
    expect(res.status).toBe(201);
    created.properties.push(res.body.data.idProperty);

    const notification = await Notification.findOne({
      where: { idUser: users.operations.idUser, relatedEntityType: "Property", relatedEntityId: res.body.data.idProperty },
    });
    expect(notification.type).toBe("property_collection:new:sale");

    const operationsEmails = (await emailEventsTo(users.operations.email)).filter(({ payload }) =>
      payload.html.includes(`/dashboard/sales/${res.body.data.idProperty}`)
    );
    expect(operationsEmails).toHaveLength(1);

    // Par défaut, la communication n'est pas concernée par la collecte.
    expect(
      await Notification.count({
        where: { idUser: users.communication.idUser, relatedEntityType: "Property" },
      })
    ).toBe(0);
  });
});
