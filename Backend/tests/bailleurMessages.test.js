import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Person,
  Bailleur,
  BailleurMessage,
  InboundEmail,
  OutboxEvent,
} from "../models/index.model.js";

const suffix = Date.now();
const MAILBOX = `bm${suffix}`;
const savedEnv = { ...process.env };
const users = {};
const cookies = {};
const bailleurs = {};
const bailleurEmail = `bailleur.message.${suffix}@gmail.com`;

beforeAll(async () => {
  Object.assign(process.env, {
    MAILBOXES: MAILBOX,
    [`MAILBOX_${MAILBOX.toUpperCase()}_ADDRESS`]: "contact@nbnexpress.org",
    [`MAILBOX_${MAILBOX.toUpperCase()}_ROLES`]: "operations",
  });

  const hashed = await bcrypt.hash("TestPass@123", await bcrypt.genSalt());
  for (const role of ["operations", "marketing"]) {
    users[role] = await User.create({
      fullName: `${role} messages ${suffix}`,
      email: `${role}.messages.${suffix}@nbn.test`,
      password: hashed,
      role,
      status: "ACTIVE",
    });
    const res = await request(app).post("/api/auth/login").send({ email: users[role].email, password: "TestPass@123" });
    cookies[role] = res.headers["set-cookie"];
  }

  const withEmail = await Person.create({ fullName: `Mama Furaha ${suffix}`, email: bailleurEmail });
  const withoutEmail = await Person.create({ fullName: `Papa Sans Mail ${suffix}` });
  bailleurs.withEmail = await Bailleur.create({ idPerson: withEmail.idPerson, type: "PROPRIETAIRE" });
  bailleurs.withoutEmail = await Bailleur.create({ idPerson: withoutEmail.idPerson, type: "MANDATAIRE" });
});

afterAll(async () => {
  const ids = Object.values(bailleurs).map((b) => b.idBailleur);
  const messages = await BailleurMessage.findAll({ where: { idBailleur: ids } });
  const eventIds = messages.map((m) => m.idOutboxEvent).filter(Boolean);
  if (eventIds.length) await OutboxEvent.destroy({ where: { idOutboxEvent: eventIds } });
  await BailleurMessage.destroy({ where: { idBailleur: ids } });
  await InboundEmail.destroy({ where: { mailboxKey: MAILBOX } });
  for (const bailleur of Object.values(bailleurs)) {
    await Bailleur.destroy({ where: { idBailleur: bailleur.idBailleur } });
    await Person.destroy({ where: { idPerson: bailleur.idPerson } });
  }
  await User.destroy({ where: { idUser: Object.values(users).map((user) => user.idUser) } });
  process.env = savedEnv;
});

describe("Emails aux bailleurs", () => {
  it("refuse un envoi sans objet (400) et un rôle sans bailleurs:manage (403)", async () => {
    const empty = await request(app)
      .post("/api/bailleur-messages/emails")
      .set("Cookie", cookies.operations)
      .send({ idBailleurs: [bailleurs.withEmail.idBailleur], subject: "", message: "x" });
    expect(empty.status).toBe(400);

    const forbidden = await request(app)
      .post("/api/bailleur-messages/emails")
      .set("Cookie", cookies.marketing)
      .send({ idBailleurs: [bailleurs.withEmail.idBailleur], subject: "Objet", message: "x" });
    expect(forbidden.status).toBe(403);
  });

  it("envoie depuis contact@ un message personnalisé, et signale les bailleurs sans e-mail", async () => {
    const res = await request(app)
      .post("/api/bailleur-messages/emails")
      .set("Cookie", cookies.operations)
      .send({
        idBailleurs: [bailleurs.withEmail.idBailleur, bailleurs.withoutEmail.idBailleur],
        subject: "Point sur vos biens, {nom}",
        message: "Bonjour {nom},\n\nPouvons-nous organiser une visite ?",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.sent).toBe(1);
    expect(res.body.data.withoutEmail).toEqual([`Papa Sans Mail ${suffix}`]);

    const [message] = await BailleurMessage.findAll({ where: { idBailleur: bailleurs.withEmail.idBailleur } });
    expect(message.channel).toBe("EMAIL");
    expect(message.body).toContain(`Bonjour Mama Furaha ${suffix},`);

    const event = await OutboxEvent.findByPk(message.idOutboxEvent);
    const payload = JSON.parse(event.payload);
    expect(payload.to).toBe(bailleurEmail);
    expect(payload.mailboxKey).toBe("contact");
    expect(payload.subject).toBe(`Point sur vos biens, Mama Furaha ${suffix}`);

    await bailleurs.withEmail.reload();
    expect(bailleurs.withEmail.dernierContact).not.toBeNull();
  });
});

describe("Contacts et historique", () => {
  it("trace un WhatsApp lancé depuis « Contacts »", async () => {
    const res = await request(app)
      .post("/api/bailleur-messages/contact-log")
      .set("Cookie", cookies.operations)
      .send({ idBailleur: bailleurs.withoutEmail.idBailleur, channel: "WHATSAPP", body: "Bonjour" });
    expect(res.status).toBe(201);

    const invalid = await request(app)
      .post("/api/bailleur-messages/contact-log")
      .set("Cookie", cookies.operations)
      .send({ idBailleur: bailleurs.withoutEmail.idBailleur, channel: "PIGEON" });
    expect(invalid.status).toBe(400);
  });

  it("l'historique réunit les messages envoyés et les e-mails reçus du bailleur", async () => {
    await InboundEmail.create({
      mailboxKey: MAILBOX,
      mailboxAddress: "contact@nbnexpress.org",
      messageId: `<reply-${suffix}@gmail.com>`,
      fromAddress: bailleurEmail,
      subject: "Re: Point sur vos biens",
      receivedAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/bailleur-messages/bailleur/${bailleurs.withEmail.idBailleur}`)
      .set("Cookie", cookies.operations);

    expect(res.status).toBe(200);
    expect(res.body.data.sent).toHaveLength(1);
    expect(res.body.data.sent[0].sender.fullName).toBe(users.operations.fullName);
    expect(res.body.data.received.map((m) => m.subject)).toEqual(["Re: Point sur vos biens"]);
  });
});
