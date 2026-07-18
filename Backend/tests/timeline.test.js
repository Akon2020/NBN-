import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Property,
  Client,
  Person,
  Bailleur,
  Commissionnaire,
  Matching,
  TimelineEvent,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPropertyIds = [];
const createdClientIds = [];
const createdBailleurIds = [];
const createdCommissionnaireIds = [];
const createdPersonIds = [];
const createdMatchingIds = [];

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

  operationsEmail = `operations.timeline.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Timeline Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  juridiqueEmail = `juridique.timeline.${suffix}@nbn.test`;
  const juridique = await User.create({
    fullName: "Juridique Timeline Test",
    email: juridiqueEmail,
    password: hashed,
    role: "juridique",
    status: "ACTIVE",
  });
  createdUserIds.push(juridique.idUser);
});

afterAll(async () => {
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
  if (createdBailleurIds.length) {
    await TimelineEvent.destroy({ where: { entityType: "BAILLEUR", entityId: createdBailleurIds } });
    await Bailleur.destroy({ where: { idBailleur: createdBailleurIds } });
  }
  if (createdCommissionnaireIds.length) {
    await TimelineEvent.destroy({
      where: { entityType: "COMMISSIONNAIRE", entityId: createdCommissionnaireIds },
    });
    await Commissionnaire.destroy({ where: { idCommissionnaire: createdCommissionnaireIds } });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("GOAL 3 - Timeline complète", () => {
  it("la création d'un bien journalise un événement CREATED consultable via /api/timeline", async () => {
    const login = await loginAs(operationsEmail);

    const propRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ category: "SALE", propertyType: "TERRAIN_PLAT", price: 5000, quartier: "Ibanda" });
    expect(propRes.status).toBe(201);
    const idProperty = propRes.body.data.idProperty;
    createdPropertyIds.push(idProperty);

    const timelineRes = await request(app)
      .get(`/api/timeline/PROPERTY/${idProperty}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.data.length).toBe(1);
    expect(timelineRes.body.data[0].eventType).toBe("CREATED");
  });

  it("entityType invalide renvoie 400", async () => {
    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .get("/api/timeline/BANANA/1")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(400);
  });

  it("un rôle sans clients:read ne peut pas consulter la timeline d'un client (403)", async () => {
    const login = await loginAs(juridiqueEmail);
    const res = await request(app)
      .get("/api/timeline/CLIENT/1")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(403);
  });

  it("une transaction client CONCLU transitionne et journalise automatiquement le bien validé (Matching VALIDE)", async () => {
    const login = await loginAs(operationsEmail);

    const propRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ category: "SALE", propertyType: "MAISON", price: 40000, quartier: "Alfajiri" });
    const idProperty = propRes.body.data.idProperty;
    createdPropertyIds.push(idProperty);
    expect(propRes.body.data.statut).toBe("DISPONIBLE");

    const personRes = await Person.create({
      fullName: `Client Timeline ${suffix}`,
      phone: "+243900000200",
    });
    createdPersonIds.push(personRes.idPerson);

    const clientRes = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ idPerson: personRes.idPerson, type: "ACHETEUR" });
    expect(clientRes.status).toBe(201);
    const idClient = clientRes.body.data.idClient;
    createdClientIds.push(idClient);

    const matchRes = await request(app)
      .post("/api/matchings")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ idClient, idProperty });
    expect(matchRes.status).toBe(201);
    createdMatchingIds.push(matchRes.body.data.idMatching);

    const validateRes = await request(app)
      .patch(`/api/matchings/${matchRes.body.data.idMatching}`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statut: "VALIDE" });
    expect(validateRes.status).toBe(200);

    const concludeRes = await request(app)
      .patch(`/api/clients/${idClient}`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statutPipeline: "CONCLU" });
    expect(concludeRes.status).toBe(200);

    const propertyAfter = await Property.findByPk(idProperty);
    expect(propertyAfter.statut).toBe("VENDU");

    const propertyTimeline = await request(app)
      .get(`/api/timeline/PROPERTY/${idProperty}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    const statusChangeEvent = propertyTimeline.body.data.find((e) => e.eventType === "STATUS_CHANGED");
    expect(statusChangeEvent).toBeDefined();
    expect(statusChangeEvent.metadata.automatic).toBe(true);

    const clientTimeline = await request(app)
      .get(`/api/timeline/CLIENT/${idClient}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(
      clientTimeline.body.data.some((e) => e.eventType === "STATUT_PIPELINE_CHANGED")
    ).toBe(true);
  });

  it("filtre la timeline par eventType", async () => {
    const login = await loginAs(operationsEmail);
    const idProperty = createdPropertyIds[0];

    const res = await request(app)
      .get(`/api/timeline/PROPERTY/${idProperty}?eventType=CREATED`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((e) => e.eventType === "CREATED")).toBe(true);
  });
});
