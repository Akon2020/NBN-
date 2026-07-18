import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  CalendarEvent,
  CalendarEventParticipant,
  Notification,
  Reminder,
} from "../models/index.model.js";
import { processDueReminders } from "../services/reminder.worker.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdCalendarEventIds = [];
const createdReminderIds = [];

let creatorEmail;
let creatorUserId;
let participantUserId;

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

const inRangeDate = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  creatorEmail = `operations.calevent.${suffix}@nbn.test`;
  const creator = await User.create({
    fullName: "Operations Calevent Test",
    email: creatorEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  creatorUserId = creator.idUser;
  createdUserIds.push(creator.idUser);

  const participant = await User.create({
    fullName: "Juridique Calevent Test",
    email: `juridique.calevent.${suffix}@nbn.test`,
    password: hashed,
    role: "juridique",
    status: "ACTIVE",
  });
  participantUserId = participant.idUser;
  createdUserIds.push(participant.idUser);
});

afterAll(async () => {
  if (createdReminderIds.length) {
    await Notification.destroy({
      where: { relatedEntityType: "Reminder", relatedEntityId: createdReminderIds },
    });
    await Reminder.destroy({ where: { idReminder: createdReminderIds } });
  }
  if (createdCalendarEventIds.length) {
    await Notification.destroy({
      where: { relatedEntityType: "CalendarEvent", relatedEntityId: createdCalendarEventIds },
    });
    await CalendarEventParticipant.destroy({ where: { idCalendarEvent: createdCalendarEventIds } });
    await CalendarEvent.destroy({ where: { idCalendarEvent: createdCalendarEventIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("GOAL 11 - Assignation et notifications du calendrier", () => {
  it("crée un rendez-vous avec participants, notifie chacun mais jamais le créateur", async () => {
    const login = await loginAs(creatorEmail);

    const res = await request(app)
      .post("/api/calendar")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        title: `Visite bien ${suffix}`,
        startAt: inRangeDate().toISOString(),
        participantUserIds: [participantUserId],
      });
    expect(res.status).toBe(201);
    createdCalendarEventIds.push(res.body.data.idCalendarEvent);
    expect(res.body.data.participants.length).toBe(1);
    expect(res.body.data.participants[0].idUser).toBe(participantUserId);

    const notifications = await Notification.findAll({
      where: {
        relatedEntityType: "CalendarEvent",
        relatedEntityId: res.body.data.idCalendarEvent,
      },
    });
    expect(notifications.length).toBe(1);
    expect(notifications[0].idUser).toBe(participantUserId);
  });

  it("un participant voit l'événement dans son propre calendrier même sans en être propriétaire", async () => {
    const creatorLogin = await loginAs(creatorEmail);
    const create = await request(app)
      .post("/api/calendar")
      .set("Authorization", `Bearer ${creatorLogin.body.data.token}`)
      .send({
        title: `Réunion partagée ${suffix}`,
        startAt: inRangeDate().toISOString(),
        participantUserIds: [participantUserId],
      });
    createdCalendarEventIds.push(create.body.data.idCalendarEvent);

    const participantLogin = await loginAs(`juridique.calevent.${suffix}@nbn.test`);
    const list = await request(app)
      .get("/api/calendar")
      .set("Authorization", `Bearer ${participantLogin.body.data.token}`);
    expect(list.status).toBe(200);
    expect(
      list.body.data.some(
        (e) => e.source === "EVENT" && e.id === create.body.data.idCalendarEvent
      )
    ).toBe(true);
  });

  it("modifie les participants d'un événement (ajout notifié, retrait silencieux)", async () => {
    const login = await loginAs(creatorEmail);
    const create = await request(app)
      .post("/api/calendar")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: `Rendez-vous seul ${suffix}`, startAt: inRangeDate().toISOString() });
    createdCalendarEventIds.push(create.body.data.idCalendarEvent);
    expect(create.body.data.participants.length).toBe(0);

    const update = await request(app)
      .patch(`/api/calendar/${create.body.data.idCalendarEvent}`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ participantUserIds: [participantUserId] });
    expect(update.status).toBe(200);
    expect(update.body.data.participants.length).toBe(1);

    const notifications = await Notification.findAll({
      where: {
        relatedEntityType: "CalendarEvent",
        relatedEntityId: create.body.data.idCalendarEvent,
      },
    });
    expect(notifications.some((n) => n.idUser === participantUserId)).toBe(true);

    const clear = await request(app)
      .patch(`/api/calendar/${create.body.data.idCalendarEvent}`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ participantUserIds: [] });
    expect(clear.status).toBe(200);
    expect(clear.body.data.participants.length).toBe(0);
  });

  it("404 sur la modification d'un événement inexistant", async () => {
    const login = await loginAs(creatorEmail);
    const res = await request(app)
      .patch("/api/calendar/999999999")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: "x" });
    expect(res.status).toBe(404);
  });
});

describe("GOAL 11 - Worker de rappels échus", () => {
  it("transforme un rappel échu en notification et le marque ENVOYE", async () => {
    const reminder = await Reminder.create({
      idUser: creatorUserId,
      title: `Rappel échu ${suffix}`,
      message: "Ne pas oublier",
      dueAt: new Date(Date.now() - 60 * 1000), // déjà passé
      statut: "PLANIFIE",
      createdBy: creatorUserId,
    });
    createdReminderIds.push(reminder.idReminder);

    const processed = await processDueReminders();
    expect(processed).toBeGreaterThanOrEqual(1);

    const updated = await Reminder.findByPk(reminder.idReminder);
    expect(updated.statut).toBe("ENVOYE");
    expect(updated.sentAt).not.toBeNull();

    const notifications = await Notification.findAll({
      where: { relatedEntityType: null, idUser: creatorUserId, type: "reminder:due" },
    });
    expect(notifications.some((n) => n.title === reminder.title)).toBe(true);
  });

  it("ne retraite jamais un rappel déjà ENVOYE", async () => {
    const reminder = await Reminder.create({
      idUser: creatorUserId,
      title: `Rappel déjà traité ${suffix}`,
      dueAt: new Date(Date.now() - 60 * 1000),
      statut: "ENVOYE",
      sentAt: new Date(),
      createdBy: creatorUserId,
    });
    createdReminderIds.push(reminder.idReminder);

    const beforeCount = await Notification.count({
      where: { idUser: creatorUserId, type: "reminder:due", title: reminder.title },
    });
    await processDueReminders();
    const afterCount = await Notification.count({
      where: { idUser: creatorUserId, type: "reminder:due", title: reminder.title },
    });
    expect(afterCount).toBe(beforeCount);
  });
});
