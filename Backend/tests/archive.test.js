import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Property,
  Client,
  Person,
  Requisition,
  Caisse,
  CaisseBalance,
  Mission,
  Commissionnaire,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPropertyIds = [];
const createdClientIds = [];
const createdPersonIds = [];
const createdRequisitionIds = [];
const createdCaisseIds = [];
const createdMissionIds = [];
const createdCommissionnaireIds = [];

let operationsEmail;
let juridiqueEmail;
let tresorerieEmail;
let tresorerieUserId;
let caisseId;
let commissionnaireId;

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

  operationsEmail = `operations.archive.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Archive Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  juridiqueEmail = `juridique.archive.${suffix}@nbn.test`;
  const juridique = await User.create({
    fullName: "Juridique Archive Test",
    email: juridiqueEmail,
    password: hashed,
    role: "juridique",
    status: "ACTIVE",
  });
  createdUserIds.push(juridique.idUser);

  tresorerieEmail = `tresorerie.archive.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie Archive Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  tresorerieUserId = tresorerie.idUser;
  createdUserIds.push(tresorerie.idUser);

  const caisse = await Caisse.create({ label: `Caisse Archive Test ${suffix}` });
  caisseId = caisse.idCaisse;
  createdCaisseIds.push(caisseId);
  await CaisseBalance.bulkCreate([{ idCaisse: caisseId, currencyCode: "USD", balance: 1000 }]);

  const person = await Person.create({
    fullName: `Commissionnaire Archive ${suffix}`,
    phone: "+243900000077",
  });
  createdPersonIds.push(person.idPerson);
  const commissionnaire = await Commissionnaire.create({
    idPerson: person.idPerson,
    code: `COM-ARCH-${suffix}`,
  });
  commissionnaireId = commissionnaire.idCommissionnaire;
  createdCommissionnaireIds.push(commissionnaireId);
});

afterAll(async () => {
  if (createdMissionIds.length) {
    await Mission.destroy({ where: { idMission: createdMissionIds }, force: true });
  }
  if (createdCommissionnaireIds.length) {
    await Commissionnaire.destroy({ where: { idCommissionnaire: createdCommissionnaireIds } });
  }
  if (createdRequisitionIds.length) {
    await Requisition.destroy({ where: { idRequisition: createdRequisitionIds }, force: true });
  }
  if (createdCaisseIds.length) {
    await CaisseBalance.destroy({ where: { idCaisse: createdCaisseIds } });
    await Caisse.destroy({ where: { idCaisse: createdCaisseIds } });
  }
  if (createdClientIds.length) {
    await Client.destroy({ where: { idClient: createdClientIds }, force: true });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdPropertyIds.length) {
    await Property.destroy({ where: { idProperty: createdPropertyIds }, force: true });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G21 - Archivage formalisé", () => {
  it("supprime un bien (soft delete réversible) puis le restaure", async () => {
    const login = await loginAs(operationsEmail);

    const property = await Property.create({
      category: "SALE",
      propertyType: "MAISON",
      quartier: `Quartier Soft Delete ${suffix}`,
      price: 15000,
      statut: "DISPONIBLE",
      createdBy: 1,
    });
    createdPropertyIds.push(property.idProperty);

    const del = await request(app)
      .delete(`/api/properties/${property.idProperty}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(del.status).toBe(200);

    // Invisible en usage normal (paranoid exclut automatiquement).
    const listAfterDelete = await request(app)
      .get("/api/properties")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    const idsAfterDelete = listAfterDelete.body.propertiesInfo.map((p) => p.idProperty);
    expect(idsAfterDelete).not.toContain(property.idProperty);

    // Réversible à court terme.
    const restore = await request(app)
      .post(`/api/properties/${property.idProperty}/restore`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(restore.status).toBe(200);

    const listAfterRestore = await request(app)
      .get("/api/properties")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    const idsAfterRestore = listAfterRestore.body.propertiesInfo.map((p) => p.idProperty);
    expect(idsAfterRestore).toContain(property.idProperty);
  });

  it("restaurer un bien qui n'est pas supprimé échoue (400)", async () => {
    const login = await loginAs(operationsEmail);
    const property = await Property.create({
      category: "SALE",
      propertyType: "MAISON",
      quartier: `Quartier Restore 400 ${suffix}`,
      price: 12000,
      statut: "DISPONIBLE",
      createdBy: 1,
    });
    createdPropertyIds.push(property.idProperty);

    const res = await request(app)
      .post(`/api/properties/${property.idProperty}/restore`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(400);
  });

  it("archive un bien (motif obligatoire), le désencombre des listes actives, puis le désarchive", async () => {
    const login = await loginAs(operationsEmail);

    const property = await Property.create({
      category: "SALE",
      propertyType: "MAISON",
      quartier: `Quartier Archive ${suffix}`,
      price: 30000,
      statut: "VENDU",
      createdBy: 1,
    });
    createdPropertyIds.push(property.idProperty);

    const noReason = await request(app)
      .post(`/api/properties/${property.idProperty}/archive`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({});
    expect(noReason.status).toBe(400);

    const archive = await request(app)
      .post(`/api/properties/${property.idProperty}/archive`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ reason: "Vendu depuis plus d'un an" });
    expect(archive.status).toBe(200);

    // Archivé mais toujours consultable individuellement (jamais supprimé).
    const single = await request(app)
      .get(`/api/properties/${property.idProperty}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(single.status).toBe(200);

    const listDefault = await request(app)
      .get("/api/properties")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listDefault.body.propertiesInfo.map((p) => p.idProperty)).not.toContain(
      property.idProperty
    );

    const listIncluded = await request(app)
      .get("/api/properties?includeArchived=true")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listIncluded.body.propertiesInfo.map((p) => p.idProperty)).toContain(
      property.idProperty
    );

    const doubleArchive = await request(app)
      .post(`/api/properties/${property.idProperty}/archive`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ reason: "Encore" });
    expect(doubleArchive.status).toBe(400);

    const unarchive = await request(app)
      .post(`/api/properties/${property.idProperty}/unarchive`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(unarchive.status).toBe(200);

    const listAfterUnarchive = await request(app)
      .get("/api/properties")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listAfterUnarchive.body.propertiesInfo.map((p) => p.idProperty)).toContain(
      property.idProperty
    );
  });

  it("un rôle sans property:manage ne peut pas archiver un bien (403)", async () => {
    const login = await loginAs(juridiqueEmail);
    const property = await Property.create({
      category: "SALE",
      propertyType: "MAISON",
      quartier: `Quartier 403 ${suffix}`,
      price: 5000,
      statut: "DISPONIBLE",
      createdBy: 1,
    });
    createdPropertyIds.push(property.idProperty);

    const res = await request(app)
      .post(`/api/properties/${property.idProperty}/archive`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ reason: "Motif" });
    expect(res.status).toBe(403);
  });

  it("supprime un client (soft delete) puis le restaure", async () => {
    const login = await loginAs(operationsEmail);
    const person = await Person.create({
      fullName: `Client Soft Delete ${suffix}`,
      phone: "+243900000078",
    });
    createdPersonIds.push(person.idPerson);
    const client = await Client.create({ idPerson: person.idPerson, type: "ACHETEUR" });
    createdClientIds.push(client.idClient);

    const del = await request(app)
      .delete(`/api/clients/${client.idClient}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(del.status).toBe(200);

    const listAfterDelete = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listAfterDelete.body.data.map((c) => c.idClient)).not.toContain(client.idClient);

    const restore = await request(app)
      .post(`/api/clients/${client.idClient}/restore`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(restore.status).toBe(200);

    const listAfterRestore = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listAfterRestore.body.data.map((c) => c.idClient)).toContain(client.idClient);
  });

  it("archive un client puis le désarchive", async () => {
    const login = await loginAs(operationsEmail);
    const person = await Person.create({
      fullName: `Client Archive ${suffix}`,
      phone: "+243900000079",
    });
    createdPersonIds.push(person.idPerson);
    const client = await Client.create({
      idPerson: person.idPerson,
      type: "ACHETEUR",
      statutPipeline: "PERDU",
    });
    createdClientIds.push(client.idClient);

    const archive = await request(app)
      .post(`/api/clients/${client.idClient}/archive`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ reason: "Prospect perdu, plus de suivi actif" });
    expect(archive.status).toBe(200);

    const listDefault = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listDefault.body.data.map((c) => c.idClient)).not.toContain(client.idClient);

    const unarchive = await request(app)
      .post(`/api/clients/${client.idClient}/unarchive`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(unarchive.status).toBe(200);
  });

  it("archive une réquisition (traçabilité conservée, jamais supprimée) puis la désarchive", async () => {
    const login = await loginAs(tresorerieEmail);

    const requisition = await Requisition.create({
      demandeurId: tresorerieUserId,
      idCaisse: caisseId,
      nature: "Fournitures bureau",
      coutEstime: 50,
      currencyCode: "USD",
      statut: "APPROUVEE",
    });
    createdRequisitionIds.push(requisition.idRequisition);

    const archive = await request(app)
      .post(`/api/requisitions/${requisition.idRequisition}/archive`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ reason: "Réquisition ancienne, décaissée" });
    expect(archive.status).toBe(200);

    const listDefault = await request(app)
      .get("/api/requisitions")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listDefault.body.data.map((r) => r.idRequisition)).not.toContain(
      requisition.idRequisition
    );

    const listIncluded = await request(app)
      .get("/api/requisitions?includeArchived=true")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listIncluded.body.data.map((r) => r.idRequisition)).toContain(
      requisition.idRequisition
    );

    const unarchive = await request(app)
      .post(`/api/requisitions/${requisition.idRequisition}/unarchive`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(unarchive.status).toBe(200);
  });

  it("archive une mission terrain puis la désarchive", async () => {
    const login = await loginAs(operationsEmail);

    const mission = await Mission.create({
      uuid: `mission-archive-${suffix}`,
      idCommissionnaire: commissionnaireId,
      type: "SUIVI",
      statut: "VALIDEE",
    });
    createdMissionIds.push(mission.idMission);

    const archive = await request(app)
      .post(`/api/missions/${mission.idMission}/archive`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ reason: "Mission clôturée depuis longtemps" });
    expect(archive.status).toBe(200);

    const listDefault = await request(app)
      .get("/api/missions")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listDefault.body.data.map((m) => m.idMission)).not.toContain(mission.idMission);

    const unarchive = await request(app)
      .post(`/api/missions/${mission.idMission}/unarchive`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(unarchive.status).toBe(200);

    const listAfterUnarchive = await request(app)
      .get("/api/missions")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listAfterUnarchive.body.data.map((m) => m.idMission)).toContain(mission.idMission);
  });
});
