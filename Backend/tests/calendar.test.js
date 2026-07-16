import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Task,
  Reminder,
  Person,
  Client,
  CalendarEvent,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdTaskIds = [];
const createdReminderIds = [];
const createdPersonIds = [];
const createdClientIds = [];
const createdCalendarEventIds = [];

let operationsEmail;
let operationsUserId;

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

const inRangeDate = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // +3 jours
const outOfRangeDate = () => new Date(Date.now() + 120 * 24 * 60 * 60 * 1000); // +120 jours

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  operationsEmail = `operations.calendar.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Calendar Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  operationsUserId = operations.idUser;
  createdUserIds.push(operations.idUser);
});

afterAll(async () => {
  if (createdCalendarEventIds.length) {
    await CalendarEvent.destroy({ where: { idCalendarEvent: createdCalendarEventIds } });
  }
  if (createdTaskIds.length) {
    await Task.destroy({ where: { idTask: createdTaskIds } });
  }
  if (createdReminderIds.length) {
    await Reminder.destroy({ where: { idReminder: createdReminderIds } });
  }
  if (createdClientIds.length) {
    await Client.destroy({ where: { idClient: createdClientIds } });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G19 - Calendrier agrégé", () => {
  it("agrège une tâche avec échéance, un rappel et une relance client dans la même période", async () => {
    const login = await loginAs(operationsEmail);

    const task = await Task.create({
      title: `Tâche calendrier ${suffix}`,
      dateEcheance: inRangeDate(),
      createdBy: operationsUserId,
    });
    createdTaskIds.push(task.idTask);

    const reminder = await Reminder.create({
      idUser: operationsUserId,
      title: `Rappel calendrier ${suffix}`,
      dueAt: inRangeDate(),
      createdBy: operationsUserId,
    });
    createdReminderIds.push(reminder.idReminder);

    const person = await Person.create({ fullName: `Client Relance ${suffix}`, phone: "+243900000006" });
    createdPersonIds.push(person.idPerson);
    const client = await Client.create({
      idPerson: person.idPerson,
      type: "ACHETEUR",
      prochaineRelance: inRangeDate(),
    });
    createdClientIds.push(client.idClient);

    // Tâche hors période — ne doit jamais apparaître dans le résultat.
    const outOfRangeTask = await Task.create({
      title: `Tâche hors période ${suffix}`,
      dateEcheance: outOfRangeDate(),
      createdBy: operationsUserId,
    });
    createdTaskIds.push(outOfRangeTask.idTask);

    const res = await request(app)
      .get("/api/calendar")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    const sources = res.body.data.map((e) => e.source);
    expect(sources).toContain("TASK");
    expect(sources).toContain("REMINDER");
    expect(sources).toContain("RELANCE_CLIENT");

    const taskEvent = res.body.data.find((e) => e.source === "TASK" && e.id === task.idTask);
    expect(taskEvent).toBeDefined();
    expect(taskEvent.title).toBe(task.title);

    const outOfRangeEvent = res.body.data.find(
      (e) => e.source === "TASK" && e.id === outOfRangeTask.idTask
    );
    expect(outOfRangeEvent).toBeUndefined();
  });

  it("crée et supprime un rendez-vous ponctuel (CalendarEvent propre, sans autre source)", async () => {
    const login = await loginAs(operationsEmail);

    const create = await request(app)
      .post("/api/calendar")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: "Rendez-vous test", startAt: inRangeDate().toISOString() });
    expect(create.status).toBe(201);
    createdCalendarEventIds.push(create.body.data.idCalendarEvent);

    const list = await request(app)
      .get("/api/calendar")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    const eventEntry = list.body.data.find(
      (e) => e.source === "EVENT" && e.id === create.body.data.idCalendarEvent
    );
    expect(eventEntry).toBeDefined();

    const del = await request(app)
      .delete(`/api/calendar/${create.body.data.idCalendarEvent}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(del.status).toBe(200);
  });

  it("un rendez-vous sans title/startAt est refusé (400)", async () => {
    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .post("/api/calendar")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
