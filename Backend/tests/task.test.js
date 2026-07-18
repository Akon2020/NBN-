import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Property,
  Task,
  TaskAssignee,
  TaskPropertyLink,
  TaskComment,
  Notification,
  Reminder,
  TimelineEvent,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPropertyIds = [];
const createdTaskIds = [];

let operationsEmail;
let operationsUserId;
let commissionnaireEmail;
let commissionnaireUserId;
let otherReaderEmail;
let propertyId;

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

  operationsEmail = `operations.task.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Task Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  operationsUserId = operations.idUser;
  createdUserIds.push(operations.idUser);

  commissionnaireEmail = `commissionnaire.task.${suffix}@nbn.test`;
  const commissionnaire = await User.create({
    fullName: "Commissionnaire Task Test",
    email: commissionnaireEmail,
    password: hashed,
    role: "commissionnaire",
    status: "ACTIVE",
  });
  commissionnaireUserId = commissionnaire.idUser;
  createdUserIds.push(commissionnaire.idUser);

  otherReaderEmail = `other.reader.task.${suffix}@nbn.test`;
  const otherReader = await User.create({
    fullName: "Other Reader Task Test",
    email: otherReaderEmail,
    password: hashed,
    role: "commissionnaire",
    status: "ACTIVE",
  });
  createdUserIds.push(otherReader.idUser);

  const property = await Property.create({
    category: "SALE",
    propertyType: "MAISON",
    quartier: `Quartier Task Test ${suffix}`,
    price: 10000,
    statut: "DISPONIBLE",
    createdBy: operationsUserId,
  });
  propertyId = property.idProperty;
  createdPropertyIds.push(propertyId);
});

afterAll(async () => {
  if (createdTaskIds.length) {
    await TaskComment.destroy({ where: { idTask: createdTaskIds } });
    await Reminder.destroy({ where: { relatedEntityType: "Task", relatedEntityId: createdTaskIds } });
    await Notification.destroy({ where: { relatedEntityType: "Task", relatedEntityId: createdTaskIds } });
    await TimelineEvent.destroy({ where: { entityType: "TASK", entityId: createdTaskIds } });
    await TaskAssignee.destroy({ where: { idTask: createdTaskIds } });
    await TaskPropertyLink.destroy({ where: { idTask: createdTaskIds } });
    await Task.destroy({ where: { idTask: createdTaskIds } });
  }
  if (createdPropertyIds.length) {
    await Property.destroy({ where: { idProperty: createdPropertyIds }, force: true });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G16 - Module Tasks (Kanban)", () => {
  it("un rôle avec tasks:manage peut créer une tâche avec assigné et bien lié", async () => {
    const login = await loginAs(operationsEmail);

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        title: "Visiter le bien",
        description: "Organiser une visite avec le client",
        priorite: "HAUTE",
        assigneeUserIds: [operationsUserId],
        idProperties: [propertyId],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.statut).toBe("A_FAIRE");
    expect(res.body.data.assignees).toHaveLength(1);
    expect(res.body.data.propertyLinks).toHaveLength(1);
    expect(res.body.data.propertyLinks[0].property.idProperty).toBe(propertyId);
    createdTaskIds.push(res.body.data.idTask);
  });

  it("un rôle sans tasks:manage ne peut pas créer de tâche (403) mais peut lister (tasks:read)", async () => {
    const login = await loginAs(commissionnaireEmail);

    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: "Refusé" });
    expect(createRes.status).toBe(403);

    const listRes = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(listRes.status).toBe(200);
  });

  it("déplacer une tâche sur le Kanban ne modifie jamais le statut du bien lié", async () => {
    const login = await loginAs(operationsEmail);

    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: "Suivi bien", idProperties: [propertyId] });
    createdTaskIds.push(create.body.data.idTask);

    const before = await Property.findByPk(propertyId);
    expect(before.statut).toBe("DISPONIBLE");

    const move = await request(app)
      .patch(`/api/tasks/${create.body.data.idTask}/statut`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statut: "TERMINEE" });

    expect(move.status).toBe(200);
    expect(move.body.data.statut).toBe("TERMINEE");

    const after = await Property.findByPk(propertyId);
    expect(after.statut).toBe("DISPONIBLE"); // inchangé — règle stricte CLAUDE.md §4
  });

  it("un statut invalide est refusé (400)", async () => {
    const login = await loginAs(operationsEmail);

    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: "Tâche statut invalide" });
    createdTaskIds.push(create.body.data.idTask);

    const res = await request(app)
      .patch(`/api/tasks/${create.body.data.idTask}/statut`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statut: "INEXISTANT" });

    expect(res.status).toBe(400);
  });

  it("la mise à jour remplace intégralement les assignés (plus d'assigné = liste vide)", async () => {
    const login = await loginAs(operationsEmail);

    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: "Tâche assignation", assigneeUserIds: [operationsUserId] });
    createdTaskIds.push(create.body.data.idTask);
    expect(create.body.data.assignees).toHaveLength(1);

    const update = await request(app)
      .patch(`/api/tasks/${create.body.data.idTask}`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ assigneeUserIds: [] });

    expect(update.status).toBe(200);
    expect(update.body.data.assignees).toHaveLength(0);
  });

  it("supprime une tâche", async () => {
    const login = await loginAs(operationsEmail);

    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: "Tâche à supprimer" });

    const del = await request(app)
      .delete(`/api/tasks/${create.body.data.idTask}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(del.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/tasks/${create.body.data.idTask}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(getRes.status).toBe(404);
  });
});

describe("GOAL 15 - Commentaires, historique, notifications et rappels de tâche", () => {
  it("créer une tâche avec assigné journalise CREATED et notifie l'assigné (pas le créateur)", async () => {
    const login = await loginAs(operationsEmail);

    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: "Tâche assignée notifiée", assigneeUserIds: [commissionnaireUserId] });
    expect(create.status).toBe(201);
    createdTaskIds.push(create.body.data.idTask);

    const timelineEvent = await TimelineEvent.findOne({
      where: { entityType: "TASK", entityId: create.body.data.idTask, eventType: "CREATED" },
    });
    expect(timelineEvent).not.toBeNull();

    const notif = await Notification.findOne({
      where: {
        idUser: commissionnaireUserId,
        relatedEntityType: "Task",
        relatedEntityId: create.body.data.idTask,
        type: "task:assigned",
      },
    });
    expect(notif).not.toBeNull();

    const creatorNotif = await Notification.findOne({
      where: {
        idUser: operationsUserId,
        relatedEntityType: "Task",
        relatedEntityId: create.body.data.idTask,
        type: "task:assigned",
      },
    });
    expect(creatorNotif).toBeNull();
  });

  it("changer le statut notifie les assignés concernés, jamais l'acteur", async () => {
    const login = await loginAs(operationsEmail);

    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: "Tâche statut notifié", assigneeUserIds: [commissionnaireUserId] });
    createdTaskIds.push(create.body.data.idTask);

    const move = await request(app)
      .patch(`/api/tasks/${create.body.data.idTask}/statut`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statut: "EN_COURS" });
    expect(move.status).toBe(200);

    const notif = await Notification.findOne({
      where: {
        idUser: commissionnaireUserId,
        relatedEntityType: "Task",
        relatedEntityId: create.body.data.idTask,
        type: "task:status_changed",
      },
    });
    expect(notif).not.toBeNull();

    const timelineEvent = await TimelineEvent.findOne({
      where: { entityType: "TASK", entityId: create.body.data.idTask, eventType: "STATUT_CHANGED" },
    });
    expect(timelineEvent).not.toBeNull();
  });

  it("un rappel d'échéance PLANIFIE est créé pour chaque assigné, et retiré si l'assigné est retiré", async () => {
    const login = await loginAs(operationsEmail);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        title: "Tâche avec échéance",
        dateEcheance: tomorrow,
        assigneeUserIds: [commissionnaireUserId],
      });
    createdTaskIds.push(create.body.data.idTask);

    const reminder = await Reminder.findOne({
      where: {
        idUser: commissionnaireUserId,
        relatedEntityType: "Task",
        relatedEntityId: create.body.data.idTask,
        statut: "PLANIFIE",
      },
    });
    expect(reminder).not.toBeNull();

    const update = await request(app)
      .patch(`/api/tasks/${create.body.data.idTask}`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ assigneeUserIds: [] });
    expect(update.status).toBe(200);

    const remindersAfter = await Reminder.findAll({
      where: {
        relatedEntityType: "Task",
        relatedEntityId: create.body.data.idTask,
        statut: "PLANIFIE",
      },
    });
    expect(remindersAfter).toHaveLength(0);
  });

  it("ajouter un commentaire notifie les assignés et le créateur (pas l'auteur), et journalise un événement", async () => {
    const opsLogin = await loginAs(operationsEmail);
    const commissionnaireLogin = await loginAs(commissionnaireEmail);

    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${opsLogin.body.data.token}`)
      .send({ title: "Tâche commentée", assigneeUserIds: [commissionnaireUserId] });
    createdTaskIds.push(create.body.data.idTask);

    const comment = await request(app)
      .post(`/api/tasks/${create.body.data.idTask}/comments`)
      .set("Authorization", `Bearer ${commissionnaireLogin.body.data.token}`)
      .send({ content: "Je m'en occupe cet après-midi." });
    expect(comment.status).toBe(201);
    expect(comment.body.data.content).toBe("Je m'en occupe cet après-midi.");

    const creatorNotif = await Notification.findOne({
      where: {
        idUser: operationsUserId,
        relatedEntityType: "Task",
        relatedEntityId: create.body.data.idTask,
        type: "task:comment",
      },
    });
    expect(creatorNotif).not.toBeNull();

    const authorNotif = await Notification.findOne({
      where: {
        idUser: commissionnaireUserId,
        relatedEntityType: "Task",
        relatedEntityId: create.body.data.idTask,
        type: "task:comment",
      },
    });
    expect(authorNotif).toBeNull();

    const timelineEvent = await TimelineEvent.findOne({
      where: { entityType: "TASK", entityId: create.body.data.idTask, eventType: "COMMENT" },
    });
    expect(timelineEvent).not.toBeNull();

    const list = await request(app)
      .get(`/api/tasks/${create.body.data.idTask}/comments`)
      .set("Authorization", `Bearer ${opsLogin.body.data.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
  });

  it("un commentaire vide est refusé (400)", async () => {
    const login = await loginAs(operationsEmail);
    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: "Tâche commentaire vide" });
    createdTaskIds.push(create.body.data.idTask);

    const comment = await request(app)
      .post(`/api/tasks/${create.body.data.idTask}/comments`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ content: "   " });
    expect(comment.status).toBe(400);
  });

  it("seul l'auteur ou un titulaire de tasks:manage peut supprimer un commentaire", async () => {
    const opsLogin = await loginAs(operationsEmail);
    const commissionnaireLogin = await loginAs(commissionnaireEmail);
    const otherLogin = await loginAs(otherReaderEmail);

    const create = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${opsLogin.body.data.token}`)
      .send({ title: "Tâche modération commentaire" });
    createdTaskIds.push(create.body.data.idTask);

    const comment = await request(app)
      .post(`/api/tasks/${create.body.data.idTask}/comments`)
      .set("Authorization", `Bearer ${commissionnaireLogin.body.data.token}`)
      .send({ content: "Commentaire à modérer" });

    const forbidden = await request(app)
      .delete(`/api/tasks/${create.body.data.idTask}/comments/${comment.body.data.idTaskComment}`)
      .set("Authorization", `Bearer ${otherLogin.body.data.token}`);
    expect(forbidden.status).toBe(403);

    const managedDelete = await request(app)
      .delete(`/api/tasks/${create.body.data.idTask}/comments/${comment.body.data.idTaskComment}`)
      .set("Authorization", `Bearer ${opsLogin.body.data.token}`);
    expect(managedDelete.status).toBe(200);
  });
});
