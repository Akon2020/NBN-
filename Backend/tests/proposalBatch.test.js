import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, Person, Client, Property, Proposal, TimelineEvent } from "../models/index.model.js";

const suffix = Date.now();
const users = {};
const cookies = {};
let client;
const properties = [];

beforeAll(async () => {
  const hashed = await bcrypt.hash("TestPass@123", await bcrypt.genSalt());
  for (const role of ["operations", "tresorerie"]) {
    users[role] = await User.create({
      fullName: `${role} proposal ${suffix}`,
      email: `${role}.proposal.${suffix}@nbn.test`,
      password: hashed,
      role,
      status: "ACTIVE",
    });
    const res = await request(app).post("/api/auth/login").send({ email: users[role].email, password: "TestPass@123" });
    cookies[role] = res.headers["set-cookie"];
  }

  const person = await Person.create({ fullName: `Client Proposition ${suffix}`, phone: `+24395${String(suffix).slice(-7)}` });
  client = await Client.create({ idPerson: person.idPerson, type: "LOCATAIRE", statutPipeline: "NOUVEAU" });

  for (const quartier of ["Panzi", "Nyalukemba"]) {
    properties.push(
      await Property.create({
        category: "RENT",
        propertyType: "APPARTEMENT",
        commune: "IBANDA",
        quartier,
        avenue: `Av. ${suffix}`,
        price: 300,
        prixMinimum: 250,
        informateur: "Informateur confidentiel",
      })
    );
  }
});

afterAll(async () => {
  await Proposal.destroy({ where: { idClient: client.idClient } });
  await TimelineEvent.destroy({ where: { entityType: "CLIENT", entityId: client.idClient } });
  await Property.destroy({ where: { idProperty: properties.map((p) => p.idProperty) }, force: true });
  await Client.destroy({ where: { idClient: client.idClient }, force: true });
  await Person.destroy({ where: { idPerson: client.idPerson } });
  await User.destroy({ where: { idUser: Object.values(users).map((user) => user.idUser) } });
});

describe("Envoi d'une sélection de biens à un client", () => {
  it("refuse un envoi sans bien (400)", async () => {
    const res = await request(app)
      .post("/api/proposals/batch")
      .set("Cookie", cookies.operations)
      .send({ idClient: client.idClient, idProperties: [] });
    expect(res.status).toBe(400);
  });

  it("refuse un rôle sans clients:manage (403)", async () => {
    const res = await request(app)
      .post("/api/proposals/batch")
      .set("Cookie", cookies.tresorerie)
      .send({ idClient: client.idClient, idProperties: [properties[0].idProperty] });
    expect(res.status).toBe(403);
  });

  it("enregistre une proposition par bien et fait passer un client « Nouveau » à « Proposé »", async () => {
    const res = await request(app)
      .post("/api/proposals/batch")
      .set("Cookie", cookies.operations)
      .send({
        idClient: client.idClient,
        idProperties: properties.map((p) => p.idProperty),
        channel: "WHATSAPP",
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ created: 2, total: 2, pipelineAdvanced: true });
    await client.reload();
    expect(client.statutPipeline).toBe("PROPOSE");

    const stored = await Proposal.findAll({ where: { idClient: client.idClient } });
    expect(stored.every((p) => p.channel === "WHATSAPP" && p.sentBy === users.operations.idUser)).toBe(true);
  });

  it("ne fait jamais reculer un dossier déjà plus avancé", async () => {
    await client.update({ statutPipeline: "NEGOCIATION" });

    const res = await request(app)
      .post("/api/proposals/batch")
      .set("Cookie", cookies.operations)
      .send({ idClient: client.idClient, idProperties: [properties[0].idProperty] });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ created: 1, total: 3, pipelineAdvanced: false });
    await client.reload();
    expect(client.statutPipeline).toBe("NEGOCIATION");
  });

  it("l'historique montre les biens proposés sans aucune donnée confidentielle", async () => {
    const res = await request(app)
      .get(`/api/proposals/client/${client.idClient}`)
      .set("Cookie", cookies.operations);

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe(3);
    const [latest] = res.body.data;
    expect(latest.sender.fullName).toBe(users.operations.fullName);
    expect(latest.property.quartier).toBeDefined();
    for (const confidential of ["idBailleur", "prixMinimum", "margin", "informateur", "codeCommissionnaire"]) {
      expect(latest.property).not.toHaveProperty(confidential);
    }
  });
});
