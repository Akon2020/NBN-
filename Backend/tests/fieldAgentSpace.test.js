import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  AuthToken,
  Client,
  Commission,
  Commissionnaire,
  Notification,
  OutboxEvent,
  Person,
  Property,
  Task,
  TaskAssignee,
  TaskComment,
  TimelineEvent,
  User,
} from "../models/index.model.js";

const suffix = Date.now();
const password = "TestPass@123";
const number = 800000 + (suffix % 90000);
const code = `CMR-${number}`;
const otherCode = `CMR-${number + 1}`;
const ids = { users: [], persons: [], agents: [], clients: [], properties: [], tasks: [], commissions: [] };
let operationsCookies;
let agent;
let otherAgent;

const login = async (email, pwd = password) => {
  const res = await request(app).post("/api/auth/login").send({ email, password: pwd });
  return res.headers["set-cookie"];
};

beforeAll(async () => {
  const hashed = await bcrypt.hash(password, 4);
  const operations = await User.create({ fullName: "Ops Espace", email: `ops.espace.${suffix}@nbn.test`, password: hashed, role: "operations", status: "ACTIVE" });
  ids.users.push(operations.idUser);
  operationsCookies = await login(operations.email);

  const [person, otherPerson] = await Person.bulkCreate([
    { fullName: `Agent Espace ${suffix}`, phone: "+243970009991", email: `agent.espace.${suffix}@nbn.test` },
    { fullName: `Autre Agent ${suffix}`, phone: "+243970009992" },
  ]);
  ids.persons.push(person.idPerson, otherPerson.idPerson);
  agent = await Commissionnaire.create({ idPerson: person.idPerson, code, profil: "COMMISSIONNAIRE", scoreGlobal: 42 });
  otherAgent = await Commissionnaire.create({ idPerson: otherPerson.idPerson, code: otherCode, profil: "COMMISSIONNAIRE" });
  ids.agents.push(agent.idCommissionnaire, otherAgent.idCommissionnaire);

  // Deux clients apportés (un conclu), un client d'un autre commissionnaire.
  const clientPersons = await Person.bulkCreate([
    { fullName: `Client A ${suffix}` },
    { fullName: `Client B ${suffix}` },
    { fullName: `Client C ${suffix}` },
  ]);
  ids.persons.push(...clientPersons.map((p) => p.idPerson));
  const clients = await Client.bulkCreate([
    { idPerson: clientPersons[0].idPerson, type: "LOCATAIRE", sourceCommissionnaireCode: code, statutPipeline: "CONCLU" },
    { idPerson: clientPersons[1].idPerson, type: "LOCATAIRE", sourceCommissionnaireCode: code, statutPipeline: "VISITE_PROGRAMMEE" },
    { idPerson: clientPersons[2].idPerson, type: "LOCATAIRE", sourceCommissionnaireCode: otherCode },
  ]);
  ids.clients.push(...clients.map((c) => c.idClient));

  const property = await Property.create({ category: "RENT", propertyType: "APPARTEMENT", codeCommissionnaire: code, price: 300, prixMinimum: 250 });
  ids.properties.push(property.idProperty);

  const commission = await Commission.create({
    idClient: clients[0].idClient,
    beneficiaireType: "COMMISSIONNAIRE",
    idCommissionnaire: agent.idCommissionnaire,
    montantTransaction: 300,
    currencyCode: "USD",
    montantCommission: 30,
    createdBy: operations.idUser,
  });
  ids.commissions.push(commission.idCommission);
});

afterAll(async () => {
  await TaskComment.destroy({ where: { idTask: ids.tasks } });
  await TaskAssignee.destroy({ where: { idTask: ids.tasks } });
  await TimelineEvent.destroy({ where: { entityType: "TASK", entityId: ids.tasks } });
  await TimelineEvent.destroy({ where: { entityType: "COMMISSIONNAIRE", entityId: ids.agents } });
  await Task.destroy({ where: { idTask: ids.tasks } });
  await Commission.destroy({ where: { idCommission: ids.commissions } });
  await Property.destroy({ where: { idProperty: ids.properties }, force: true });
  await Client.destroy({ where: { idClient: ids.clients }, force: true });
  await Commissionnaire.destroy({ where: { idCommissionnaire: ids.agents } });
  const persons = await Person.findAll({ where: { idPerson: ids.persons } });
  const userIds = [...ids.users, ...persons.map((p) => p.idUser).filter(Boolean)];
  await Person.destroy({ where: { idPerson: ids.persons } });
  await Notification.destroy({ where: { idUser: userIds } });
  await AuthToken.destroy({ where: { idUser: userIds } });
  await User.destroy({ where: { idUser: userIds } });
});

describe("P1.2 - Clé d'accès et première connexion", () => {
  let accessKey;
  let agentCookies;

  it("l'agence crée le compte et envoie une clé d'accès (e-mail + lien WhatsApp)", async () => {
    const res = await request(app)
      .post(`/api/commissionnaires/${agent.idCommissionnaire}/access-key`)
      .set("Cookie", operationsCookies)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.accessKey).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    expect(res.body.data.link).toContain("/auth/activer?cle=");
    expect(res.body.data.whatsappLink).toMatch(/^https:\/\/wa\.me\/243970009991\?text=/);
    expect(res.body.data.emailQueued).toBe(true);
    accessKey = res.body.data.accessKey;

    const person = await Person.findByPk(agent.idPerson);
    const user = await User.findByPk(person.idUser);
    expect(user.role).toBe("commissionnaire");
  });

  it("la clé, saisie en minuscules, ouvre l'activation puis la session", async () => {
    const check = await request(app).post("/api/auth/token/check").send({ token: accessKey.toLowerCase().replace("-", " ") });
    expect(check.status).toBe(200);
    expect(check.body.purpose).toBe("ACCESS_KEY");

    const setup = await request(app)
      .post("/api/auth/reset-password/confirm")
      .send({ token: accessKey, newPassword: "MonEspace@2026" });
    expect(setup.status).toBe(200);
    expect(setup.body.signedIn).toBe(true);
    agentCookies = setup.headers["set-cookie"];

    const again = await request(app).post("/api/auth/reset-password/confirm").send({ token: accessKey, newPassword: "Autre@2026x" });
    expect(again.status).toBe(400);
  });

  it("son espace : indicateurs, sans notation ni données des autres", async () => {
    const res = await request(app).get("/api/field-agent/me").set("Cookie", agentCookies);
    expect(res.status).toBe(200);
    expect(res.body.data.fiche.code).toBe(code);
    expect(res.body.data.fiche.scoreGlobal).toBeUndefined();
    expect(res.body.data.stats).toMatchObject({
      biensEnregistres: 1,
      clientsTraites: 1,
      clientsEnCours: 1,
      commissions: { enAttente: { USD: 30 } },
    });

    const clients = await request(app).get("/api/field-agent/clients").set("Cookie", agentCookies);
    expect(clients.body.data.map((c) => c.idClient).sort()).toEqual(ids.clients.slice(0, 2).sort());

    const properties = await request(app).get("/api/field-agent/properties").set("Cookie", agentCookies);
    expect(properties.body.data).toHaveLength(1);
    expect(properties.body.data[0].prixMinimum).toBeUndefined();
    expect(properties.body.data[0].idBailleur).toBeUndefined();

    // Plus d'accès à la liste des fiches (notation des autres).
    const list = await request(app).get("/api/commissionnaires").set("Cookie", agentCookies);
    expect(list.status).toBe(403);
    const me = await request(app).get("/api/commissionnaires/me").set("Cookie", agentCookies);
    expect(me.status).toBe(200);
    expect(me.body.classement).toBeUndefined();
  });

  it("ses tâches seulement : statut, puis conclusion déclarée à valider par l'agence", async () => {
    const person = await Person.findByPk(agent.idPerson);
    const mine = await Task.create({ title: `Visite ${suffix}`, createdBy: ids.users[0] });
    const notMine = await Task.create({ title: `Autre ${suffix}`, createdBy: ids.users[0] });
    ids.tasks.push(mine.idTask, notMine.idTask);
    await TaskAssignee.create({ idTask: mine.idTask, idUser: person.idUser });

    const list = await request(app).get("/api/field-agent/tasks").set("Cookie", agentCookies);
    expect(list.body.data.map((t) => t.idTask)).toEqual([mine.idTask]);

    // La liste générique des tâches est elle aussi limitée pour ce rôle.
    const generic = await request(app).get("/api/tasks").set("Cookie", agentCookies);
    expect(generic.body.data.every((t) => t.idTask !== notMine.idTask)).toBe(true);

    const forbidden = await request(app)
      .patch(`/api/field-agent/tasks/${notMine.idTask}/statut`)
      .set("Cookie", agentCookies)
      .send({ statut: "EN_COURS" });
    expect(forbidden.status).toBe(404);

    const progress = await request(app)
      .patch(`/api/field-agent/tasks/${mine.idTask}/statut`)
      .set("Cookie", agentCookies)
      .send({ statut: "EN_COURS" });
    expect(progress.status).toBe(200);

    const conclusion = await request(app)
      .post(`/api/field-agent/tasks/${mine.idTask}/conclusion`)
      .set("Cookie", agentCookies)
      .send({ note: "Bail signé" });
    expect(conclusion.status).toBe(200);
    expect((await Task.findByPk(mine.idTask)).statut).toBe("EN_REVISION");
    const notice = await Notification.findOne({ where: { idUser: ids.users[0], type: "task:conclusion_declared", relatedEntityId: mine.idTask } });
    expect(notice).not.toBeNull();
  });

  it("un compte sans fiche n'a pas d'espace (404)", async () => {
    const res = await request(app).get("/api/field-agent/me").set("Cookie", operationsCookies);
    expect(res.status).toBe(404);
  });
});
