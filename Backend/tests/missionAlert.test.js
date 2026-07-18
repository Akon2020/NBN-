import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Person,
  Commissionnaire,
  Mission,
  Alert,
  Notification,
  TimelineEvent,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPersonIds = [];
const createdCommissionnaireIds = [];
const createdMissionIds = [];
const createdAlertIds = [];

let operationsEmail;
let fieldUserId;
let fieldCommissionnaireEmail;
let idCommissionnaire;
let otherFieldCommissionnaireEmail;
let idOtherCommissionnaire;

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

  operationsEmail = `operations.missionalert.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations MissionAlert Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  fieldCommissionnaireEmail = `field.missionalert.${suffix}@nbn.test`;
  const fieldUser = await User.create({
    fullName: "Field MissionAlert Test",
    email: fieldCommissionnaireEmail,
    password: hashed,
    role: "commissionnaire",
    status: "ACTIVE",
  });
  fieldUserId = fieldUser.idUser;
  createdUserIds.push(fieldUser.idUser);

  const fieldPerson = await Person.create({
    fullName: "Field MissionAlert Test",
    phone: "+243900000700",
    idUser: fieldUser.idUser,
  });
  createdPersonIds.push(fieldPerson.idPerson);

  const commissionnaire = await Commissionnaire.create({
    idPerson: fieldPerson.idPerson,
    code: `COM-MA-${suffix}`,
  });
  idCommissionnaire = commissionnaire.idCommissionnaire;
  createdCommissionnaireIds.push(idCommissionnaire);

  otherFieldCommissionnaireEmail = `otherfield.missionalert.${suffix}@nbn.test`;
  const otherFieldUser = await User.create({
    fullName: "Other Field MissionAlert Test",
    email: otherFieldCommissionnaireEmail,
    password: hashed,
    role: "commissionnaire",
    status: "ACTIVE",
  });
  createdUserIds.push(otherFieldUser.idUser);
  const otherPerson = await Person.create({
    fullName: "Other Field MissionAlert Test",
    phone: "+243900000701",
    idUser: otherFieldUser.idUser,
  });
  createdPersonIds.push(otherPerson.idPerson);
  const otherCommissionnaire = await Commissionnaire.create({
    idPerson: otherPerson.idPerson,
    code: `COM-MA-OTHER-${suffix}`,
  });
  idOtherCommissionnaire = otherCommissionnaire.idCommissionnaire;
  createdCommissionnaireIds.push(idOtherCommissionnaire);
});

afterAll(async () => {
  if (createdMissionIds.length) {
    await TimelineEvent.destroy({ where: { entityType: "MISSION", entityId: createdMissionIds } });
    await Notification.destroy({
      where: { relatedEntityType: "Mission", relatedEntityId: createdMissionIds },
    });
    await Mission.destroy({ where: { idMission: createdMissionIds }, force: true });
  }
  if (createdAlertIds.length) {
    await Notification.destroy({
      where: { relatedEntityType: "Alert", relatedEntityId: createdAlertIds },
    });
    await Alert.destroy({ where: { idAlert: createdAlertIds } });
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

describe("GOAL 14 - Missions : détail, historique, avancement, notifications", () => {
  it("crée une mission et journalise un événement MISSION CREATED", async () => {
    const login = await loginAs(fieldCommissionnaireEmail);
    const res = await request(app)
      .post("/api/missions")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        uuid: `mission-detail-${suffix}`,
        idCommissionnaire,
        type: "COLLECTE_BIEN",
        notes: "Bien à Ibanda",
      });
    expect(res.status).toBe(201);
    createdMissionIds.push(res.body.data.idMission);

    const timelineRes = await request(app)
      .get(`/api/timeline/MISSION/${res.body.data.idMission}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.data.some((e) => e.eventType === "CREATED")).toBe(true);
  });

  it("expose le détail d'une mission", async () => {
    const login = await loginAs(operationsEmail);
    const idMission = createdMissionIds[0];
    const res = await request(app)
      .get(`/api/missions/${idMission}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.idMission).toBe(idMission);
    expect(res.body.data.progression).toBe(0);
  });

  it("le commissionnaire assigné peut déclarer son avancement, un autre commissionnaire non", async () => {
    const idMission = createdMissionIds[0];

    const ownerLogin = await loginAs(fieldCommissionnaireEmail);
    const ok = await request(app)
      .patch(`/api/missions/${idMission}/progression`)
      .set("Authorization", `Bearer ${ownerLogin.body.data.token}`)
      .send({ progression: 40 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.progression).toBe(40);

    const otherLogin = await loginAs(otherFieldCommissionnaireEmail);
    const forbidden = await request(app)
      .patch(`/api/missions/${idMission}/progression`)
      .set("Authorization", `Bearer ${otherLogin.body.data.token}`)
      .send({ progression: 80 });
    expect(forbidden.status).toBe(403);

    const timelineRes = await request(app)
      .get(`/api/timeline/MISSION/${idMission}`)
      .set("Authorization", `Bearer ${ownerLogin.body.data.token}`);
    expect(timelineRes.body.data.some((e) => e.eventType === "PROGRESSION")).toBe(true);
  });

  it("valider une mission notifie le commissionnaire assigné et journalise le nouveau statut", async () => {
    const fieldLogin = await loginAs(fieldCommissionnaireEmail);
    const createRes = await request(app)
      .post("/api/missions")
      .set("Authorization", `Bearer ${fieldLogin.body.data.token}`)
      .send({ uuid: `mission-validate-${suffix}`, idCommissionnaire, type: "SUIVI" });
    const idMission = createRes.body.data.idMission;
    createdMissionIds.push(idMission);

    const operationsLogin = await loginAs(operationsEmail);
    const res = await request(app)
      .patch(`/api/missions/${idMission}/valider`)
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe("VALIDEE");

    const notifications = await Notification.findAll({
      where: { idUser: fieldUserId, relatedEntityType: "Mission", relatedEntityId: idMission },
    });
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe("mission:validee");

    const timelineRes = await request(app)
      .get(`/api/timeline/MISSION/${idMission}`)
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`);
    expect(timelineRes.body.data.some((e) => e.eventType === "VALIDEE")).toBe(true);
  });
});

describe("GOAL 14 - Alertes : graphe de transitions imposé côté Backend", () => {
  it("crée une alerte manuelle et expose son détail", async () => {
    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .post("/api/alerts")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ type: "test:manuelle", title: `Alerte test ${suffix}` });
    expect(res.status).toBe(201);
    createdAlertIds.push(res.body.data.idAlert);

    const detail = await request(app)
      .get(`/api/alerts/${res.body.data.idAlert}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.statut).toBe("OUVERTE");
  });

  it("suit le cycle de vie complet OUVERTE -> RECONNUE -> EN_COURS -> RESOLUE -> CLOTUREE", async () => {
    const login = await loginAs(operationsEmail);
    const idAlert = createdAlertIds[0];

    for (const statut of ["RECONNUE", "EN_COURS", "RESOLUE", "CLOTUREE"]) {
      const res = await request(app)
        .patch(`/api/alerts/${idAlert}/statut`)
        .set("Authorization", `Bearer ${login.body.data.token}`)
        .send({ statut });
      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe(statut);
    }
  });

  it("refuse une transition qui saute des étapes (OUVERTE -> CLOTUREE)", async () => {
    const login = await loginAs(operationsEmail);
    const createRes = await request(app)
      .post("/api/alerts")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ type: "test:skip", title: `Alerte skip ${suffix}` });
    const idAlert = createRes.body.data.idAlert;
    createdAlertIds.push(idAlert);

    const res = await request(app)
      .patch(`/api/alerts/${idAlert}/statut`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statut: "CLOTUREE" });
    expect(res.status).toBe(400);
  });

  it("refuse une transition vers le statut déjà actif", async () => {
    const login = await loginAs(operationsEmail);
    const createRes = await request(app)
      .post("/api/alerts")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ type: "test:noop", title: `Alerte noop ${suffix}` });
    const idAlert = createRes.body.data.idAlert;
    createdAlertIds.push(idAlert);

    const res = await request(app)
      .patch(`/api/alerts/${idAlert}/statut`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statut: "OUVERTE" });
    expect(res.status).toBe(400);
  });

  it("refuse de réassigner une alerte clôturée", async () => {
    const login = await loginAs(operationsEmail);
    const idAlert = createdAlertIds[0]; // déjà CLOTUREE (test précédent)

    const res = await request(app)
      .patch(`/api/alerts/${idAlert}/assigner`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ assignedTo: 1 });
    expect(res.status).toBe(400);
  });
});
