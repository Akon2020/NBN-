import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Property,
  Person,
  Client,
  Bailleur,
  Commissionnaire,
  Task,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const marker = `Zztest${suffix}`;

const createdUserIds = [];
const createdPersonIds = [];
const createdPropertyIds = [];
let clientId;
let bailleurId;
let commissionnaireId;
let taskId;

let operationsEmail;
let consultantEmail;

const login = async (email) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: testPassword });
  expect(res.status).toBe(200);
  return res.body.data.token;
};

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  operationsEmail = `operations.search.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Search Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  consultantEmail = `consultant.search.${suffix}@nbn.test`;
  const consultant = await User.create({
    fullName: "Consultant Search Test",
    email: consultantEmail,
    password: hashed,
    role: "consultant",
    status: "ACTIVE",
  });
  createdUserIds.push(consultant.idUser);

  const property = await Property.create({
    category: "SALE",
    propertyType: "MAISON",
    quartier: `Quartier ${marker}`,
    price: 5000,
    statut: "DISPONIBLE",
    createdBy: operations.idUser,
  });
  createdPropertyIds.push(property.idProperty);

  const clientPerson = await Person.create({ fullName: `Client ${marker}` });
  createdPersonIds.push(clientPerson.idPerson);
  const client = await Client.create({ idPerson: clientPerson.idPerson, type: "LOCATAIRE" });
  clientId = client.idClient;

  const bailleurPerson = await Person.create({ fullName: `Bailleur ${marker}` });
  createdPersonIds.push(bailleurPerson.idPerson);
  const bailleur = await Bailleur.create({ idPerson: bailleurPerson.idPerson, type: "PROPRIETAIRE" });
  bailleurId = bailleur.idBailleur;

  const commissionnairePerson = await Person.create({ fullName: `Commissionnaire ${marker}` });
  createdPersonIds.push(commissionnairePerson.idPerson);
  const commissionnaire = await Commissionnaire.create({
    idPerson: commissionnairePerson.idPerson,
    code: `COM-${suffix}`,
  });
  commissionnaireId = commissionnaire.idCommissionnaire;

  const task = await Task.create({
    title: `Tâche ${marker}`,
    createdBy: operations.idUser,
  });
  taskId = task.idTask;
});

afterAll(async () => {
  if (taskId) await Task.destroy({ where: { idTask: taskId } });
  if (commissionnaireId) await Commissionnaire.destroy({ where: { idCommissionnaire: commissionnaireId } });
  if (bailleurId) await Bailleur.destroy({ where: { idBailleur: bailleurId } });
  if (clientId) await Client.destroy({ where: { idClient: clientId } });
  if (createdPersonIds.length) await Person.destroy({ where: { idPerson: createdPersonIds } });
  if (createdPropertyIds.length) {
    await Property.destroy({ where: { idProperty: createdPropertyIds }, force: true });
  }
  if (createdUserIds.length) await User.destroy({ where: { idUser: createdUserIds } });
});

describe("GOAL 18 - Recherche globale transverse", () => {
  it("refuse une recherche trop courte (400)", async () => {
    const token = await login(operationsEmail);
    const res = await request(app)
      .get("/api/search?q=a")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("un rôle avec toutes les permissions de lecture reçoit tous les types de résultats", async () => {
    const token = await login(operationsEmail);
    const res = await request(app)
      .get(`/api/search?q=${marker}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.results.properties.some((p) => p.idProperty === createdPropertyIds[0])).toBe(true);
    expect(res.body.results.clients.some((c) => c.idClient === clientId)).toBe(true);
    expect(res.body.results.bailleurs.some((b) => b.idBailleur === bailleurId)).toBe(true);
    expect(res.body.results.commissionnaires.some((c) => c.idCommissionnaire === commissionnaireId)).toBe(true);
    expect(res.body.results.tasks.some((t) => t.idTask === taskId)).toBe(true);
  });

  it("un consultant (zéro permission de base) ne reçoit que les biens, jamais les autres types", async () => {
    const token = await login(consultantEmail);
    const res = await request(app)
      .get(`/api/search?q=${marker}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.results.properties.some((p) => p.idProperty === createdPropertyIds[0])).toBe(true);
    expect(res.body.results.clients).toHaveLength(0);
    expect(res.body.results.bailleurs).toHaveLength(0);
    expect(res.body.results.commissionnaires).toHaveLength(0);
    expect(res.body.results.tasks).toHaveLength(0);
  });
});

describe("GOAL 18 - Filtres serveur sur GET /api/properties", () => {
  it("filtre par quartier et fourchette de prix sans changer le comportement par défaut (sans filtre)", async () => {
    const token = await login(operationsEmail);

    const unfiltered = await request(app)
      .get("/api/properties")
      .set("Authorization", `Bearer ${token}`);
    expect(unfiltered.status).toBe(200);
    expect(unfiltered.body.propertiesInfo.some((p) => p.idProperty === createdPropertyIds[0])).toBe(true);

    const filtered = await request(app)
      .get(`/api/properties?quartier=${encodeURIComponent(marker)}&minPrice=1000&maxPrice=9000`)
      .set("Authorization", `Bearer ${token}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.propertiesInfo).toHaveLength(1);
    expect(filtered.body.propertiesInfo[0].idProperty).toBe(createdPropertyIds[0]);

    const outOfRange = await request(app)
      .get(`/api/properties?quartier=${encodeURIComponent(marker)}&minPrice=6000`)
      .set("Authorization", `Bearer ${token}`);
    expect(outOfRange.status).toBe(200);
    expect(outOfRange.body.propertiesInfo).toHaveLength(0);
  });
});
