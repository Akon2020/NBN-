import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, Property, Task, TaskAssignee, TaskPropertyLink } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPropertyIds = [];
const createdTaskIds = [];

let operationsEmail;
let operationsUserId;
let commissionnaireEmail;
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
  createdUserIds.push(commissionnaire.idUser);

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
