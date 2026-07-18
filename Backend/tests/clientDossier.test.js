import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Property,
  Client,
  Person,
  Matching,
  ClientComplaint,
  TimelineEvent,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPropertyIds = [];
const createdClientIds = [];
const createdPersonIds = [];
const createdMatchingIds = [];
const createdComplaintIds = [];

let operationsEmail;
let juridiqueEmail;

const loginCache = new Map();
const loginAs = async (email) => {
  if (loginCache.has(email)) {
    return loginCache.get(email);
  }
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: testPassword });
  expect(res.status).toBe(200);
  loginCache.set(email, res);
  return res;
};

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  operationsEmail = `operations.dossier.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Dossier Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  juridiqueEmail = `juridique.dossier.${suffix}@nbn.test`;
  const juridique = await User.create({
    fullName: "Juridique Dossier Test",
    email: juridiqueEmail,
    password: hashed,
    role: "juridique",
    status: "ACTIVE",
  });
  createdUserIds.push(juridique.idUser);
});

afterAll(async () => {
  if (createdComplaintIds.length) {
    await ClientComplaint.destroy({ where: { idClientComplaint: createdComplaintIds } });
  }
  if (createdMatchingIds.length) {
    await Matching.destroy({ where: { idMatching: createdMatchingIds } });
  }
  if (createdPropertyIds.length) {
    await TimelineEvent.destroy({ where: { entityType: "PROPERTY", entityId: createdPropertyIds } });
    await Property.destroy({ where: { idProperty: createdPropertyIds }, force: true });
  }
  if (createdClientIds.length) {
    await TimelineEvent.destroy({ where: { entityType: "CLIENT", entityId: createdClientIds } });
    await Client.destroy({ where: { idClient: createdClientIds }, force: true });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("GOAL 8 - Rapport complet client (vue 360)", () => {
  it("refuse une plainte sans subject", async () => {
    const login = await loginAs(operationsEmail);

    const clientRes = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ fullName: `Client Plainte ${suffix}`, type: "LOCATAIRE" });
    expect(clientRes.status).toBe(201);
    const idClient = clientRes.body.data.idClient;
    createdClientIds.push(idClient);

    const res = await request(app)
      .post(`/api/clients/${idClient}/complaints`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ description: "sans sujet" });
    expect(res.status).toBe(400);
  });

  it("crée une plainte, la journalise, la liste, puis la résout", async () => {
    const login = await loginAs(operationsEmail);
    const idClient = createdClientIds[0];

    const createRes = await request(app)
      .post(`/api/clients/${idClient}/complaints`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ subject: "Fuite d'eau", description: "Salle de bain" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.statut).toBe("OUVERTE");
    const idComplaint = createRes.body.data.idClientComplaint;
    createdComplaintIds.push(idComplaint);

    const timelineRes = await request(app)
      .get(`/api/timeline/CLIENT/${idClient}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(timelineRes.body.data.some((e) => e.eventType === "PLAINTE")).toBe(true);

    const listRes = await request(app)
      .get(`/api/clients/${idClient}/complaints`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((c) => c.idClientComplaint === idComplaint)).toBe(true);

    const resolveRes = await request(app)
      .patch(`/api/clients/${idClient}/complaints/${idComplaint}/resolve`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ resolution: "Plombier envoyé" });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.statut).toBe("RESOLUE");

    const secondResolveRes = await request(app)
      .patch(`/api/clients/${idClient}/complaints/${idComplaint}/resolve`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ resolution: "encore" });
    expect(secondResolveRes.status).toBe(400);

    const timelineAfter = await request(app)
      .get(`/api/timeline/CLIENT/${idClient}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(timelineAfter.body.data.some((e) => e.eventType === "PLAINTE_RESOLUE")).toBe(true);
  });

  it("un rôle sans clients:manage ne peut pas créer de plainte (403)", async () => {
    const login = await loginAs(juridiqueEmail);
    const idClient = createdClientIds[0];
    const res = await request(app)
      .post(`/api/clients/${idClient}/complaints`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ subject: "Test" });
    expect(res.status).toBe(403);
  });

  it("le dossier agrège biens occupés, plaintes, et journalise entrée/sortie", async () => {
    const login = await loginAs(operationsEmail);

    const propRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        category: "RENT",
        propertyType: "MAISON",
        price: 400,
        quartier: "Nyawera",
        unit: "MONTH",
      });
    expect(propRes.status).toBe(201);
    const idProperty = propRes.body.data.idProperty;
    createdPropertyIds.push(idProperty);

    const personRes = await Person.create({
      fullName: `Client Dossier ${suffix}`,
      phone: "+243900000400",
    });
    createdPersonIds.push(personRes.idPerson);

    const clientRes = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ idPerson: personRes.idPerson, type: "LOCATAIRE" });
    expect(clientRes.status).toBe(201);
    const idClient = clientRes.body.data.idClient;
    createdClientIds.push(idClient);

    const matchRes = await request(app)
      .post("/api/matchings")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ idClient, idProperty });
    expect(matchRes.status).toBe(201);
    const idMatching = matchRes.body.data.idMatching;
    createdMatchingIds.push(idMatching);

    await request(app)
      .patch(`/api/matchings/${idMatching}`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statut: "VALIDE" });

    await request(app)
      .patch(`/api/clients/${idClient}`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statutPipeline: "CONCLU" });

    const complaintRes = await request(app)
      .post(`/api/clients/${idClient}/complaints`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ subject: "Bruit voisinage" });
    createdComplaintIds.push(complaintRes.body.data.idClientComplaint);

    const dossierRes = await request(app)
      .get(`/api/clients/${idClient}/dossier`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(dossierRes.status).toBe(200);
    expect(dossierRes.body.data.occupiedProperties.length).toBe(1);
    expect(dossierRes.body.data.occupiedProperties[0].property.idProperty).toBe(idProperty);
    expect(dossierRes.body.data.complaints.some((c) => c.subject === "Bruit voisinage")).toBe(
      true
    );

    const clientTimeline = await request(app)
      .get(`/api/timeline/CLIENT/${idClient}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(clientTimeline.body.data.some((e) => e.eventType === "ENTREE")).toBe(true);

    await request(app)
      .patch(`/api/properties/${idProperty}/statut`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statut: "DISPONIBLE" });

    const clientTimelineAfterSortie = await request(app)
      .get(`/api/timeline/CLIENT/${idClient}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(clientTimelineAfterSortie.body.data.some((e) => e.eventType === "SORTIE")).toBe(true);
  });
});
