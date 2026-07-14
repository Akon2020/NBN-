import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Client,
  Bailleur,
  Person,
  Property,
  Proposal,
  Matching,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdClientIds = [];
const createdBailleurIds = [];
const createdPersonIds = [];
const createdPropertyIds = [];

let operationsEmail;
let tresorerieEmail;
let juridiqueEmail;

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  operationsEmail = `operations.crm.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations CRM Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  tresorerieEmail = `tresorerie.crm.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie CRM Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  createdUserIds.push(tresorerie.idUser);

  juridiqueEmail = `juridique.crm.${suffix}@nbn.test`;
  const juridique = await User.create({
    fullName: "Juridique CRM Test",
    email: juridiqueEmail,
    password: hashed,
    role: "juridique",
    status: "ACTIVE",
  });
  createdUserIds.push(juridique.idUser);
});

afterAll(async () => {
  // Les propositions/matchings référencent idClient (FK) : à nettoyer
  // avant les clients eux-mêmes.
  if (createdClientIds.length) {
    await Proposal.destroy({ where: { idClient: createdClientIds } });
    await Matching.destroy({ where: { idClient: createdClientIds } });
    await Client.destroy({ where: { idClient: createdClientIds } });
  }
  if (createdBailleurIds.length) {
    await Bailleur.destroy({ where: { idBailleur: createdBailleurIds } });
  }
  if (createdPropertyIds.length) {
    await Property.destroy({ where: { idProperty: createdPropertyIds } });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

const loginAs = async (email) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: testPassword });
  expect(res.status).toBe(200);
  return res.headers["set-cookie"];
};

describe("BACK-G06 - Client (segmentation, pipeline)", () => {
  it("operations peut créer un client avec une nouvelle Person", async () => {
    const cookies = await loginAs(operationsEmail);
    const res = await request(app)
      .post("/api/clients")
      .set("Cookie", cookies)
      .send({
        fullName: "Client Test QA",
        phone: "+243900000010",
        type: "LOCATAIRE",
        sousType: "PARTICULIER",
        source: "WHATSAPP",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.statutPipeline).toBe("NOUVEAU");
    expect(res.body.data.person.fullName).toBe("Client Test QA");
    createdClientIds.push(res.body.data.idClient);
    createdPersonIds.push(res.body.data.idPerson);
  });

  it("juridique ne peut pas créer de client (clients:manage manquant)", async () => {
    const cookies = await loginAs(juridiqueEmail);
    const res = await request(app)
      .post("/api/clients")
      .set("Cookie", cookies)
      .send({ fullName: "Refusé", type: "ACHETEUR" });
    expect(res.status).toBe(403);
  });

  it("le pipeline commercial peut être fait progresser (BACK-G08)", async () => {
    const cookies = await loginAs(operationsEmail);
    const idClient = createdClientIds[0];
    const res = await request(app)
      .patch(`/api/clients/${idClient}`)
      .set("Cookie", cookies)
      .send({ statutPipeline: "VISITE_PROGRAMMEE" });
    expect(res.status).toBe(200);
    expect(res.body.data.statutPipeline).toBe("VISITE_PROGRAMMEE");
  });
});

describe("BACK-G06/BACK-G03 - Bailleur (fiche VIP, marge sensible)", () => {
  it("operations peut créer un bailleur", async () => {
    const cookies = await loginAs(operationsEmail);
    const res = await request(app)
      .post("/api/bailleurs")
      .set("Cookie", cookies)
      .send({
        fullName: "Bailleur Test QA",
        phone: "+243900000020",
        type: "PROPRIETAIRE",
        typeCollaboration: "REGULIERE",
        margeAgence: 200,
      });

    expect(res.status).toBe(201);
    createdBailleurIds.push(res.body.data.idBailleur);
    createdPersonIds.push(res.body.data.idPerson);
  });

  it("tresorerie voit margeAgence, operations ne le voit pas", async () => {
    const idBailleur = createdBailleurIds[0];

    const tresorerieCookies = await loginAs(tresorerieEmail);
    const withMarge = await request(app)
      .get(`/api/bailleurs/${idBailleur}`)
      .set("Cookie", tresorerieCookies);
    expect(withMarge.status).toBe(200);
    expect(withMarge.body.margeAgence).toBeTruthy();

    const operationsCookies = await loginAs(operationsEmail);
    const withoutMarge = await request(app)
      .get(`/api/bailleurs/${idBailleur}`)
      .set("Cookie", operationsCookies);
    expect(withoutMarge.status).toBe(200);
    expect(withoutMarge.body.margeAgence).toBeUndefined();
  });

  it("juridique peut consulter (bailleurs:read) mais pas modifier", async () => {
    const idBailleur = createdBailleurIds[0];
    const cookies = await loginAs(juridiqueEmail);

    const readRes = await request(app)
      .get(`/api/bailleurs/${idBailleur}`)
      .set("Cookie", cookies);
    expect(readRes.status).toBe(200);

    const updateRes = await request(app)
      .patch(`/api/bailleurs/${idBailleur}`)
      .set("Cookie", cookies)
      .send({ notes: "Ne devrait pas passer" });
    expect(updateRes.status).toBe(403);
  });
});

describe("BACK-G08 - Matching et propositions", () => {
  it("associe un client à un bien puis fait progresser le statut", async () => {
    const cookies = await loginAs(operationsEmail);

    const propertyRes = await request(app)
      .post("/api/properties")
      .set("Cookie", cookies)
      .send({ category: "SALE", propertyType: "TERRAIN_PLAT", price: 10000 });
    expect(propertyRes.status).toBe(201);
    const idProperty = propertyRes.body.data.idProperty;
    createdPropertyIds.push(idProperty);

    const idClient = createdClientIds[0];

    const matchRes = await request(app)
      .post("/api/matchings")
      .set("Cookie", cookies)
      .send({ idClient, idProperty });
    expect(matchRes.status).toBe(201);

    const updateRes = await request(app)
      .patch(`/api/matchings/${matchRes.body.data.idMatching}`)
      .set("Cookie", cookies)
      .send({ statut: "VALIDE" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.statut).toBe("VALIDE");
  });

  it("enregistre une proposition envoyée à un client réel", async () => {
    const cookies = await loginAs(operationsEmail);
    const idClient = createdClientIds[0];
    const idProperty = createdPropertyIds[0];

    const res = await request(app)
      .post("/api/proposals")
      .set("Cookie", cookies)
      .send({ idProperty, idClient, message: "Proposition de test QA" });

    expect(res.status).toBe(201);
    expect(res.body.data.idClient).toBe(idClient);
  });
});
