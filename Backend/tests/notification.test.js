import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Caisse,
  CaisseBalance,
  Requisition,
  Notification,
  Alert,
  OutboxEvent,
  Commissionnaire,
  Person,
} from "../models/index.model.js";
import { createNotification, createAlert, transitionAlert } from "../services/notification.service.js";
import { processOutboxEvents } from "../services/outbox.worker.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdCaisseIds = [];
const createdRequisitionIds = [];
const createdNotificationIds = [];
const createdAlertIds = [];
const createdOutboxIds = [];
const createdPersonIds = [];
const createdCommissionnaireIds = [];

let tresorerieEmail;
let operationsEmail;
let demandeurUserId;
let caisseId;

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

  tresorerieEmail = `tresorerie.notif.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie Notif Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  createdUserIds.push(tresorerie.idUser);

  operationsEmail = `operations.notif.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Notif Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  demandeurUserId = operations.idUser;
  createdUserIds.push(operations.idUser);

  const caisse = await Caisse.create({ label: `Caisse Notif Test ${suffix}` });
  caisseId = caisse.idCaisse;
  createdCaisseIds.push(caisseId);
  await CaisseBalance.bulkCreate([
    { idCaisse: caisseId, currencyCode: "USD", balance: 0 },
    { idCaisse: caisseId, currencyCode: "CDF", balance: 0 },
  ]);
});

afterAll(async () => {
  if (createdOutboxIds.length) {
    await OutboxEvent.destroy({ where: { idOutboxEvent: createdOutboxIds } });
  }
  if (createdNotificationIds.length) {
    await Notification.destroy({ where: { idNotification: createdNotificationIds } });
  }
  if (createdAlertIds.length) {
    await Alert.destroy({ where: { idAlert: createdAlertIds } });
  }
  if (createdRequisitionIds.length) {
    await Requisition.destroy({ where: { idRequisition: createdRequisitionIds }, force: true });
  }
  if (createdCommissionnaireIds.length) {
    await Commissionnaire.destroy({ where: { idCommissionnaire: createdCommissionnaireIds } });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdCaisseIds.length) {
    await CaisseBalance.destroy({ where: { idCaisse: createdCaisseIds } });
    await Caisse.destroy({ where: { idCaisse: createdCaisseIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G17 - Notifications/Alerts/Reminders + event bus", () => {
  it("approuver une réquisition émet une Notification pour le demandeur (bout en bout via HTTP)", async () => {
    const opLogin = await loginAs(operationsEmail);
    const create = await request(app)
      .post("/api/requisitions")
      .set("Authorization", `Bearer ${opLogin.body.data.token}`)
      .send({ idCaisse: caisseId, nature: "Notif test", coutEstime: 50, currencyCode: "USD" });
    createdRequisitionIds.push(create.body.data.idRequisition);

    const tLogin = await loginAs(tresorerieEmail);
    const approve = await request(app)
      .patch(`/api/requisitions/${create.body.data.idRequisition}/approuver`)
      .set("Authorization", `Bearer ${tLogin.body.data.token}`);
    expect(approve.status).toBe(200);

    // L'émission de l'event est synchrone mais son listener est async
    // (await createNotification à l'intérieur) — laisser une microtask
    // s'écouler avant de vérifier la persistance en base.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const notifications = await Notification.findAll({
      where: { idUser: demandeurUserId, type: "requisition:approved" },
      order: [["createdAt", "DESC"]],
    });
    expect(notifications.length).toBeGreaterThan(0);
    const notification = notifications[0];
    createdNotificationIds.push(notification.idNotification);
    expect(notification.relatedEntityId).toBe(create.body.data.idRequisition);

    // Une OutboxEvent doit avoir été mise en file pour la tentative de push
    // — matché par payload (idNotification), jamais par "le plus récent"
    // (la résolution de `createdAt` en secondes peut créer des ex æquo
    // entre tests qui s'exécutent dans la même seconde).
    const outboxEntry = await OutboxEvent.findOne({
      where: {
        eventType: "notification:push",
        payload: JSON.stringify({ idNotification: notification.idNotification }),
      },
    });
    expect(outboxEntry).not.toBeNull();
    createdOutboxIds.push(outboxEntry.idOutboxEvent);
  });

  it("le worker outbox traite une notification sans token push : SKIPPED, jamais perdu", async () => {
    const login = await loginAs(operationsEmail);
    const notification = await createNotification({
      idUser: demandeurUserId,
      type: "test:manual",
      title: "Test manuel",
      message: "Contenu de test",
    });
    createdNotificationIds.push(notification.idNotification);
    void login;

    const outboxBefore = await OutboxEvent.findOne({
      where: {
        eventType: "notification:push",
        payload: JSON.stringify({ idNotification: notification.idNotification }),
      },
    });
    createdOutboxIds.push(outboxBefore.idOutboxEvent);

    await processOutboxEvents();

    const refreshedNotification = await Notification.findByPk(notification.idNotification);
    expect(refreshedNotification.pushStatus).toBe("SKIPPED");

    const refreshedOutbox = await OutboxEvent.findByPk(outboxBefore.idOutboxEvent);
    expect(refreshedOutbox.statut).toBe("SENT"); // "traité", pas perdu, même sans push réel
  });

  it("le worker outbox marque FAILED et conserve la Notification si l'envoi échoue", async () => {
    // `pushProvider.js` appelle le `fetch` global directement (pas de SDK
    // serveur) — `vi.stubGlobal` est l'API Vitest dédiée à ce cas (une
    // simple réaffectation de `global.fetch` ne traverse pas de façon
    // fiable l'isolation de module de Vitest).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ data: { status: "error", message: "Erreur réseau simulée" } }),
      })
    );

    const user = await User.findByPk(demandeurUserId);
    await user.update({ expoPushToken: "ExponentPushToken[fake-test-token]" });

    const notification = await createNotification({
      idUser: demandeurUserId,
      type: "test:failure",
      title: "Test échec push",
    });
    createdNotificationIds.push(notification.idNotification);

    const outbox = await OutboxEvent.findOne({
      where: {
        eventType: "notification:push",
        payload: JSON.stringify({ idNotification: notification.idNotification }),
      },
    });
    createdOutboxIds.push(outbox.idOutboxEvent);

    await processOutboxEvents();

    const refreshedNotification = await Notification.findByPk(notification.idNotification);
    expect(refreshedNotification.pushStatus).toBe("FAILED");
    // La Notification (source de vérité) existe toujours en base malgré
    // l'échec du push — jamais perdue.
    expect(refreshedNotification).not.toBeNull();

    const refreshedOutbox = await OutboxEvent.findByPk(outbox.idOutboxEvent);
    expect(refreshedOutbox.statut).toBe("FAILED");
    expect(refreshedOutbox.attempts).toBe(1);

    await user.update({ expoPushToken: null });
    vi.unstubAllGlobals();
  });

  it("le cycle de vie d'une alerte notifie le responsable à chaque transition", async () => {
    const alert = await createAlert({
      type: "test:alert",
      title: "Alerte de test",
      description: "Description",
      assignedTo: demandeurUserId,
      createdBy: demandeurUserId,
    });
    createdAlertIds.push(alert.idAlert);
    expect(alert.statut).toBe("OUVERTE");

    const creationNotifs = await Notification.findAll({
      where: { idUser: demandeurUserId, relatedEntityType: "Alert", relatedEntityId: alert.idAlert },
    });
    creationNotifs.forEach((n) => createdNotificationIds.push(n.idNotification));
    expect(creationNotifs.length).toBeGreaterThan(0);

    await transitionAlert(alert, { statut: "RESOLUE", resolvedBy: demandeurUserId });
    expect(alert.statut).toBe("RESOLUE");
    expect(alert.resolvedAt).not.toBeNull();

    const transitionNotifs = await Notification.findAll({
      where: {
        idUser: demandeurUserId,
        relatedEntityType: "Alert",
        relatedEntityId: alert.idAlert,
        type: "alert:test:alert:resolue",
      },
    });
    transitionNotifs.forEach((n) => createdNotificationIds.push(n.idNotification));
    expect(transitionNotifs.length).toBeGreaterThan(0);
  });

  it("un score commissionnaire qui bascule en OBSERVATION émet une Alert réelle (bout en bout)", async () => {
    const login = await loginAs(operationsEmail);

    const person = await Person.create({ fullName: `Commissionnaire Alert Test ${suffix}`, phone: "+243900000005" });
    createdPersonIds.push(person.idPerson);
    const commissionnaire = await Commissionnaire.create({
      idPerson: person.idPerson,
      code: `CMR-ALERT-${suffix}`,
      scorePerformance: 15,
      scoreQualite: 15,
      scoreDiscipline: 25,
      scoreEngagement: 15,
      scoreGlobal: 70,
    });
    createdCommissionnaireIds.push(commissionnaire.idCommissionnaire);

    const res = await request(app)
      .post(`/api/commissionnaires/${commissionnaire.idCommissionnaire}/incidents`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ type: "RETARD", gravite: "MAJEUR", impactDiscipline: 15 });
    expect(res.status).toBe(201);
    expect(res.body.commissionnaire.statut).toBe("OBSERVATION");

    await new Promise((resolve) => setTimeout(resolve, 50));

    const alerts = await Alert.findAll({
      where: { type: "commissionnaire:score_bas" },
      order: [["createdAt", "DESC"]],
      limit: 5,
    });
    const matching = alerts.find((a) => a.title.includes(commissionnaire.code));
    expect(matching).toBeDefined();
    createdAlertIds.push(matching.idAlert);
  });
});
