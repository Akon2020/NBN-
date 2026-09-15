import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Op } from "sequelize";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Person,
  Client,
  RentalRequest,
  Task,
  TaskAssignee,
  TaskClientLink,
  Notification,
  OutboxEvent,
  Reminder,
  TimelineEvent,
} from "../models/index.model.js";

const suffix = Date.now();
const users = {};
const cookies = {};
let rentalRequest;
let client;
const externalEmail = `externe.assign.${suffix}@gmail.com`;

const emailsTo = async (to) =>
  (
    await OutboxEvent.findAll({
      where: { eventType: "email:send", payload: { [Op.like]: `%"to":"${to}"%` } },
    })
  ).map((event) => ({ event, payload: JSON.parse(event.payload) }));

beforeAll(async () => {
  const hashed = await bcrypt.hash("TestPass@123", await bcrypt.genSalt());
  for (const role of ["admin", "operations", "tresorerie"]) {
    users[role] = await User.create({
      fullName: `${role} assign ${suffix}`,
      email: `${role}.assign.${suffix}@nbn.test`,
      password: hashed,
      role,
      status: "ACTIVE",
    });
    const res = await request(app).post("/api/auth/login").send({ email: users[role].email, password: "TestPass@123" });
    cookies[role] = res.headers["set-cookie"];
  }

  const person = await Person.create({ fullName: `Client Assign ${suffix}`, phone: `+24398${String(suffix).slice(-7)}` });
  client = await Client.create({
    idPerson: person.idPerson,
    type: "LOCATAIRE",
    statutPipeline: "NOUVEAU",
    dossierNumber: `CLI-T-${suffix}`,
  });
  rentalRequest = await RentalRequest.create({
    fullName: person.fullName,
    phone: person.phone,
    email: `client.assign.${suffix}@gmail.com`,
    typesBien: ["APPARTEMENT"],
    commune: "IBANDA",
    quartier: "Panzi",
    avenues: "Kasiye",
    budgetMin: 100,
    loyerMax: 250,
    modalitePaiement: "AVANCE_1_GARANTIE_3",
    urgence: "IMMEDIAT",
    typeOccupants: "COUPLE",
    // Un emoji saisi par le client ne doit jamais faire échouer le PDF.
    autresInfos: "Proche de l'école 🏫 si possible",
    conditionsAcceptedAt: new Date(),
    idClient: client.idClient,
  });
});

afterAll(async () => {
  const tasks = await Task.findAll({ where: { title: `Demande de location — ${rentalRequest.fullName}` } });
  const taskIds = tasks.map((task) => task.idTask);
  if (taskIds.length) {
    await Reminder.destroy({ where: { relatedEntityType: "Task", relatedEntityId: taskIds } });
    await TimelineEvent.destroy({ where: { entityType: "TASK", entityId: taskIds } });
    await TaskAssignee.destroy({ where: { idTask: taskIds } });
    await TaskClientLink.destroy({ where: { idTask: taskIds } });
    await Task.destroy({ where: { idTask: taskIds } });
  }
  for (const to of [externalEmail, ...Object.values(users).map((user) => user.email)]) {
    const events = await emailsTo(to);
    await OutboxEvent.destroy({ where: { idOutboxEvent: events.map(({ event }) => event.idOutboxEvent) } });
  }
  await TimelineEvent.destroy({ where: { entityType: "CLIENT", entityId: client.idClient } });
  await rentalRequest.destroy({ force: true });
  await Client.destroy({ where: { idClient: client.idClient }, force: true });
  await Person.destroy({ where: { idPerson: client.idPerson } });
  const userIds = Object.values(users).map((user) => user.idUser);
  await Notification.destroy({ where: { idUser: userIds } });
  await User.destroy({ where: { idUser: userIds } });
});

describe("Fiche PDF d'une demande de location", () => {
  it("se télécharge en PDF, même avec un emoji dans la demande", async () => {
    const res = await request(app)
      .get(`/api/rental-requests/${rentalRequest.idRentalRequest}/pdf`)
      .set("Cookie", cookies.operations)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.body.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("Assigner une tâche depuis une demande", () => {
  it("refuse sans aucun destinataire (400)", async () => {
    const res = await request(app)
      .post(`/api/rental-requests/${rentalRequest.idRentalRequest}/assign`)
      .set("Cookie", cookies.admin)
      .send({});
    expect(res.status).toBe(400);
  });

  it("refuse une adresse saisie invalide (400)", async () => {
    const res = await request(app)
      .post(`/api/rental-requests/${rentalRequest.idRentalRequest}/assign`)
      .set("Cookie", cookies.admin)
      .send({ extraEmails: ["quelqu-un@gmail"] });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("quelqu-un@gmail");
  });

  it("refuse un rôle sans tasks:manage (403)", async () => {
    const res = await request(app)
      .post(`/api/rental-requests/${rentalRequest.idRentalRequest}/assign`)
      .set("Cookie", cookies.tresorerie)
      .send({ assigneeUserIds: [users.operations.idUser] });
    expect(res.status).toBe(403);
  });

  it("crée la tâche liée au client et envoie la fiche PDF à l'assigné et à l'adresse saisie", async () => {
    const res = await request(app)
      .post(`/api/rental-requests/${rentalRequest.idRentalRequest}/assign`)
      .set("Cookie", cookies.admin)
      .send({
        assigneeUserIds: [users.operations.idUser],
        extraEmails: [externalEmail, externalEmail.toUpperCase()],
        note: "Appeler la cliente avant vendredi.",
        dateEcheance: "2026-09-30",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.emailsQueued).toBe(2);

    const task = await Task.findByPk(res.body.data.idTask);
    // Demande « immédiate » → tâche urgente.
    expect(task.priorite).toBe("URGENTE");
    expect(task.description).toContain("Appeler la cliente avant vendredi.");
    expect(await TaskAssignee.count({ where: { idTask: task.idTask, idUser: users.operations.idUser } })).toBe(1);
    expect(await TaskClientLink.count({ where: { idTask: task.idTask, idClient: client.idClient } })).toBe(1);

    const notification = await Notification.findOne({
      where: { idUser: users.operations.idUser, type: "task:assigned", relatedEntityId: task.idTask },
    });
    expect(notification).not.toBeNull();

    const [operationsEmail] = await emailsTo(users.operations.email);
    const [externalCopy, duplicate] = await emailsTo(externalEmail);
    expect(duplicate).toBeUndefined();

    const attachment = operationsEmail.payload.attachments[0];
    expect(attachment.filename).toBe(`fiche-demande-${client.dossierNumber}.pdf`);
    expect(Buffer.from(attachment.content, "base64").subarray(0, 5).toString()).toBe("%PDF-");
    // Le compte voit le lien vers la tâche ; la personne sans compte, non.
    expect(operationsEmail.payload.html).toContain(`/dashboard/tasks/${task.idTask}`);
    expect(externalCopy.payload.html).not.toContain(`/dashboard/tasks/${task.idTask}`);
  });
});
