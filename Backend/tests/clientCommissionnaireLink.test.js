import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, Client, Person, Commissionnaire } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdClientIds = [];
const createdPersonIds = [];
const createdCommissionnaireIds = [];

let operationsEmail;
let commissionnaireCode;
let idCommissionnaire;

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

  operationsEmail = `operations.clientcom.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations ClientCom Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  const person = await Person.create({
    fullName: `Commissionnaire Link Test ${suffix}`,
    phone: "+243900000300",
  });
  createdPersonIds.push(person.idPerson);

  commissionnaireCode = `COM-LINK-${suffix}`;
  const commissionnaire = await Commissionnaire.create({
    idPerson: person.idPerson,
    code: commissionnaireCode,
  });
  idCommissionnaire = commissionnaire.idCommissionnaire;
  createdCommissionnaireIds.push(idCommissionnaire);
});

afterAll(async () => {
  if (createdClientIds.length) {
    await Client.destroy({ where: { idClient: createdClientIds }, force: true });
  }
  if (createdCommissionnaireIds.length) {
    await Commissionnaire.destroy({ where: { idCommissionnaire: createdCommissionnaireIds } });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("GOAL 4 - Relation Client/Commissionnaire (code unique)", () => {
  it("refuse un code commissionnaire inexistant à la création d'un client", async () => {
    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        fullName: `Client Bad Code ${suffix}`,
        type: "ACHETEUR",
        sourceCommissionnaireCode: "CODE-INEXISTANT",
      });
    expect(res.status).toBe(400);
  });

  it("accepte un code réel, journalise l'attribution des deux côtés, et l'expose via /clients", async () => {
    const login = await loginAs(operationsEmail);

    const clientRes = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        fullName: `Client Good Code ${suffix}`,
        type: "ACHETEUR",
        sourceCommissionnaireCode: commissionnaireCode,
      });
    expect(clientRes.status).toBe(201);
    const idClient = clientRes.body.data.idClient;
    createdClientIds.push(idClient);

    const clientTimeline = await request(app)
      .get(`/api/timeline/CLIENT/${idClient}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(
      clientTimeline.body.data.some((e) => e.eventType === "COMMISSIONNAIRE_ATTRIBUE")
    ).toBe(true);

    const commissionnaireTimeline = await request(app)
      .get(`/api/timeline/COMMISSIONNAIRE/${idCommissionnaire}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(
      commissionnaireTimeline.body.data.some((e) => e.eventType === "CLIENT_APPORTE")
    ).toBe(true);

    const clientsRes = await request(app)
      .get(`/api/commissionnaires/${idCommissionnaire}/clients`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(clientsRes.status).toBe(200);
    expect(clientsRes.body.data.some((c) => c.idClient === idClient)).toBe(true);
  });

  it("refuse un code inexistant lors de la mise à jour d'un client existant", async () => {
    const login = await loginAs(operationsEmail);
    const idClient = createdClientIds[0];

    const res = await request(app)
      .patch(`/api/clients/${idClient}`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ sourceCommissionnaireCode: "TOTALEMENT-FAUX" });
    expect(res.status).toBe(400);
  });
});
