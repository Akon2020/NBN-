import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Person,
  Bailleur,
  BailleurMessage,
  BailleurRelance,
  Notification,
  OutboxEvent,
} from "../models/index.model.js";
import { processDueRelances } from "../services/bailleurRelance.service.js";

const suffix = Date.now();
const users = {};
const cookies = {};
const bailleurs = {};
const relanceIds = [];
const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

beforeAll(async () => {
  const hashed = await bcrypt.hash("TestPass@123", await bcrypt.genSalt());
  for (const role of ["operations", "marketing"]) {
    users[role] = await User.create({
      fullName: `${role} relances ${suffix}`,
      email: `${role}.relances.${suffix}@nbn.test`,
      password: hashed,
      role,
      status: "ACTIVE",
    });
    const res = await request(app).post("/api/auth/login").send({ email: users[role].email, password: "TestPass@123" });
    cookies[role] = res.headers["set-cookie"];
  }

  const complete = await Person.create({
    fullName: `Bailleur Complet ${suffix}`,
    email: `bailleur.relance.${suffix}@gmail.com`,
    phone: `+24383${String(suffix).slice(-7)}`,
  });
  const phoneOnly = await Person.create({ fullName: `Bailleur Telephone ${suffix}`, phone: `+24384${String(suffix).slice(-7)}` });
  bailleurs.complete = await Bailleur.create({ idPerson: complete.idPerson, type: "PROPRIETAIRE" });
  bailleurs.phoneOnly = await Bailleur.create({ idPerson: phoneOnly.idPerson, type: "GERANT" });
});

afterAll(async () => {
  const ids = Object.values(bailleurs).map((b) => b.idBailleur);
  const messages = await BailleurMessage.findAll({ where: { idBailleur: ids } });
  const eventIds = messages.map((m) => m.idOutboxEvent).filter(Boolean);
  if (eventIds.length) await OutboxEvent.destroy({ where: { idOutboxEvent: eventIds } });
  await BailleurMessage.destroy({ where: { idBailleur: ids } });
  await Notification.destroy({ where: { idUser: users.operations.idUser } });
  if (relanceIds.length) await BailleurRelance.destroy({ where: { idRelance: relanceIds } });
  for (const bailleur of Object.values(bailleurs)) {
    await Bailleur.destroy({ where: { idBailleur: bailleur.idBailleur } });
    await Person.destroy({ where: { idPerson: bailleur.idPerson } });
  }
  await User.destroy({ where: { idUser: Object.values(users).map((user) => user.idUser) } });
});

const create = (body, role = "operations") =>
  request(app).post("/api/bailleur-relances").set("Cookie", cookies[role]).send(body);

describe("Relances programmées", () => {
  it("refuse un rôle sans bailleurs:manage (403) et un e-mail sans objet (400)", async () => {
    const payload = {
      channel: "EMAIL",
      idBailleurs: [bailleurs.complete.idBailleur],
      scheduledAt: inOneHour(),
      message: "Bonjour {nom}",
    };
    expect((await create({ ...payload, subject: "Relance" }, "marketing")).status).toBe(403);
    expect((await create(payload)).status).toBe(400);
  });

  it("une relance e-mail future attend sa date, écarte les bailleurs sans e-mail, puis part toute seule", async () => {
    const res = await create({
      channel: "EMAIL",
      idBailleurs: [bailleurs.complete.idBailleur, bailleurs.phoneOnly.idBailleur],
      scheduledAt: inOneHour(),
      subject: "Disponibilité de vos biens, {nom}",
      message: "Bonjour {nom},\n\nVos biens sont-ils toujours disponibles ?",
    });
    expect(res.status).toBe(201);
    relanceIds.push(res.body.data.idRelance);
    expect(res.body.data).toMatchObject({ statut: "PLANIFIEE", recipients: 1, skipped: [`Bailleur Telephone ${suffix}`] });

    // Le cron ne touche pas une relance future.
    await processDueRelances(new Date());
    let [message] = await BailleurMessage.findAll({ where: { idRelance: res.body.data.idRelance } });
    expect(message.statut).toBe("PLANIFIE");

    // Une heure plus tard : envoi automatique depuis contact@.
    await processDueRelances(new Date(Date.now() + 2 * 60 * 60 * 1000));
    [message] = await BailleurMessage.findAll({ where: { idRelance: res.body.data.idRelance } });
    expect(message.statut).toBe("ENVOYE");
    const payload = JSON.parse((await OutboxEvent.findByPk(message.idOutboxEvent)).payload);
    expect(payload.mailboxKey).toBe("contact");
    expect(payload.subject).toBe(`Disponibilité de vos biens, Bailleur Complet ${suffix}`);

    const relance = await BailleurRelance.findByPk(res.body.data.idRelance);
    expect(relance.statut).toBe("TERMINEE");

    // Un second passage ne renvoie rien.
    expect(await processDueRelances(new Date(Date.now() + 3 * 60 * 60 * 1000))).toBe(0);
  });

  it("une relance WhatsApp échue prépare les messages et notifie l'agent, qui les marque envoyés", async () => {
    const res = await create({
      channel: "WHATSAPP",
      idBailleurs: [bailleurs.complete.idBailleur, bailleurs.phoneOnly.idBailleur],
      scheduledAt: new Date(Date.now() - 60 * 1000).toISOString(),
      message: "Bonjour {nom}, petit rappel de NBN Express.",
    });
    expect(res.status).toBe(201);
    relanceIds.push(res.body.data.idRelance);
    expect(res.body.data.statut).toBe("EN_COURS");

    const messages = await BailleurMessage.findAll({ where: { idRelance: res.body.data.idRelance } });
    expect(messages.map((m) => m.statut)).toEqual(["A_ENVOYER", "A_ENVOYER"]);
    expect(messages.some((m) => m.body === `Bonjour Bailleur Telephone ${suffix}, petit rappel de NBN Express.`)).toBe(true);

    const notification = await Notification.findOne({
      where: { idUser: users.operations.idUser, type: "bailleur_relance:whatsapp", relatedEntityId: res.body.data.idRelance },
    });
    expect(notification).not.toBeNull();

    for (const message of messages) {
      const sent = await request(app)
        .post(`/api/bailleur-relances/messages/${message.idBailleurMessage}/sent`)
        .set("Cookie", cookies.operations);
      expect(sent.status).toBe(200);
    }
    expect((await BailleurRelance.findByPk(res.body.data.idRelance)).statut).toBe("TERMINEE");

    const detail = await request(app)
      .get(`/api/bailleur-relances/${res.body.data.idRelance}`)
      .set("Cookie", cookies.operations);
    expect(detail.body.data.messages.every((m) => m.statut === "ENVOYE" && m.bailleur.person.fullName)).toBe(true);
  });

  it("annule une relance encore planifiée, et l'historique la montre", async () => {
    const res = await create({
      channel: "WHATSAPP",
      idBailleurs: [bailleurs.phoneOnly.idBailleur],
      scheduledAt: inOneHour(),
      message: "Rappel",
    });
    relanceIds.push(res.body.data.idRelance);

    const cancel = await request(app)
      .post(`/api/bailleur-relances/${res.body.data.idRelance}/cancel`)
      .set("Cookie", cookies.operations);
    expect(cancel.status).toBe(200);

    const again = await request(app)
      .post(`/api/bailleur-relances/${res.body.data.idRelance}/cancel`)
      .set("Cookie", cookies.operations);
    expect(again.status).toBe(409);

    const list = await request(app).get("/api/bailleur-relances").set("Cookie", cookies.operations);
    const cancelled = list.body.data.find((r) => r.idRelance === res.body.data.idRelance);
    expect(cancelled.statut).toBe("ANNULEE");
    expect(cancelled.counts).toEqual({ ANNULE: 1 });
  });
});
