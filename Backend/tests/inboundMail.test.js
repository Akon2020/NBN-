import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  InboundEmail,
  InboundEmailReply,
  MailboxState,
  Notification,
} from "../models/index.model.js";
import { pollMailbox, setImapClientFactory } from "../services/inboundMail.service.js";
import { setMailboxTransportFactory } from "../services/email.service.js";
import { getMailbox } from "../config/mailboxes.js";

const suffix = Date.now();
// Clés propres au test : jamais les boîtes « contact »/« direction » réelles
// de l'environnement de développement.
const CONTACT = `tc${suffix}`;
const DIRECTION = `td${suffix}`;
const savedEnv = { ...process.env };
const users = {};
const cookies = {};

// --- Faux serveur IMAP ------------------------------------------------------
const servers = { [CONTACT]: { uidValidity: 7, messages: [] }, [DIRECTION]: { uidValidity: 7, messages: [] } };

const rawEmail = ({ from, subject, body, id }) =>
  Buffer.from(
    [
      `From: ${from}`,
      `To: agence@nbnexpress.org`,
      `Subject: ${subject}`,
      `Message-ID: <${id}@example.com>`,
      "Date: Tue, 15 Sep 2026 10:00:00 +0000",
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\r\n")
  );

const addMessage = (key, message) => {
  const server = servers[key];
  const uid = server.messages.length + 11;
  server.messages.push({ uid, source: rawEmail({ ...message, id: `${key}-${uid}` }) });
};

setImapClientFactory((mailbox) => {
  const server = servers[mailbox.key];
  return {
    connect: async () => {},
    logout: async () => {},
    getMailboxLock: async () => ({ release: () => {} }),
    get mailbox() {
      const lastUid = server.messages.at(-1)?.uid ?? 10;
      return { uidValidity: server.uidValidity, uidNext: lastUid + 1 };
    },
    fetch: async function* (range) {
      const from = Number(range.split(":")[0]);
      const matches = server.messages.filter((m) => m.uid >= from);
      // Comme un vrai serveur : `n:*` renvoie au moins le dernier message.
      yield* matches.length ? matches : server.messages.slice(-1);
    },
  };
});

const configureMailboxes = () => {
  Object.assign(process.env, {
    MAILBOXES: `${CONTACT},${DIRECTION}`,
    [`MAILBOX_${CONTACT.toUpperCase()}_ADDRESS`]: "contact@nbnexpress.org",
    [`MAILBOX_${CONTACT.toUpperCase()}_PASSWORD`]: "secret",
    [`MAILBOX_${CONTACT.toUpperCase()}_IMAP_HOST`]: "imap.test",
    [`MAILBOX_${CONTACT.toUpperCase()}_SMTP_HOST`]: "smtp.test",
    [`MAILBOX_${CONTACT.toUpperCase()}_ROLES`]: "admin,communication,marketing",
    [`MAILBOX_${DIRECTION.toUpperCase()}_ADDRESS`]: "direction@nbnexpress.org",
    [`MAILBOX_${DIRECTION.toUpperCase()}_PASSWORD`]: "secret",
    [`MAILBOX_${DIRECTION.toUpperCase()}_IMAP_HOST`]: "imap.test",
    [`MAILBOX_${DIRECTION.toUpperCase()}_ROLES`]: "direction",
  });
};

const notificationsOf = (role) =>
  Notification.findAll({ where: { idUser: users[role].idUser, type: "inbound_email:new" } });

beforeAll(async () => {
  configureMailboxes();
  const hashed = await bcrypt.hash("TestPass@123", await bcrypt.genSalt());
  for (const role of ["admin", "communication", "operations", "direction"]) {
    users[role] = await User.create({
      fullName: `${role} inbound ${suffix}`,
      email: `${role}.inbound.${suffix}@nbn.test`,
      password: hashed,
      role,
      status: "ACTIVE",
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: users[role].email, password: "TestPass@123" });
    cookies[role] = res.headers["set-cookie"];
  }
});

afterEach(() => {
  configureMailboxes();
});

afterAll(async () => {
  const emails = await InboundEmail.findAll({ where: { mailboxKey: [CONTACT, DIRECTION] } });
  const ids = emails.map((email) => email.idInboundEmail);
  if (ids.length) await InboundEmailReply.destroy({ where: { idInboundEmail: ids } });
  await InboundEmail.destroy({ where: { mailboxKey: [CONTACT, DIRECTION] } });
  await MailboxState.destroy({ where: { mailboxKey: [CONTACT, DIRECTION] } });
  const userIds = Object.values(users).map((user) => user.idUser);
  await Notification.destroy({ where: { idUser: userIds } });
  await User.destroy({ where: { idUser: userIds } });
  process.env = savedEnv;
});

describe("Relève des boîtes professionnelles", () => {
  it("la première relève fixe le point de départ sans importer l'historique", async () => {
    addMessage(CONTACT, { from: "Ancien <ancien@gmail.com>", subject: "Vieux message", body: "..." });

    const result = await pollMailbox(getMailbox(CONTACT));

    expect(result.baseline).toBe(true);
    expect(await InboundEmail.count({ where: { mailboxKey: CONTACT } })).toBe(0);
  });

  it("un nouveau message sur contact@ notifie admin et communication, pas les opérations", async () => {
    addMessage(CONTACT, {
      from: "Jeanne Mukendi <jeanne@gmail.com>",
      subject: "Appartement à Ibanda",
      body: "Bonjour, je cherche un appartement.",
    });

    const result = await pollMailbox(getMailbox(CONTACT));

    expect(result.imported).toBe(1);
    const email = await InboundEmail.findOne({ where: { mailboxKey: CONTACT } });
    expect(email.fromAddress).toBe("jeanne@gmail.com");
    expect(email.textBody).toContain("je cherche un appartement");

    expect(await notificationsOf("admin")).toHaveLength(1);
    expect(await notificationsOf("communication")).toHaveLength(1);
    expect(await notificationsOf("operations")).toHaveLength(0);
    expect(await notificationsOf("direction")).toHaveLength(0);
  });

  it("une relève suivante ne réimporte jamais un message", async () => {
    const result = await pollMailbox(getMailbox(CONTACT));
    expect(result.imported).toBe(0);
    expect(await InboundEmail.count({ where: { mailboxKey: CONTACT } })).toBe(1);
  });

  it("un message sur direction@ ne notifie que la direction, pas l'admin", async () => {
    await pollMailbox(getMailbox(DIRECTION)); // point de départ
    addMessage(DIRECTION, { from: "partenaire@banque.cd", subject: "Proposition", body: "Confidentiel" });

    await pollMailbox(getMailbox(DIRECTION));

    const directionNotifications = (await notificationsOf("direction")).length;
    expect(directionNotifications).toBe(1);
    expect(await notificationsOf("admin")).toHaveLength(1); // toujours celle de contact@
  });
});

describe("Consultation et réponse depuis le site", () => {
  it("chacun ne voit que les messages de ses boîtes", async () => {
    const communication = await request(app).get("/api/inbound-emails").set("Cookie", cookies.communication);
    expect(communication.status).toBe(200);
    expect(communication.body.data.every((email) => email.mailboxKey === CONTACT)).toBe(true);
    expect(communication.body.data.some((email) => email.mailboxKey === CONTACT)).toBe(true);

    const operations = await request(app).get("/api/inbound-emails").set("Cookie", cookies.operations);
    expect(operations.body.data.filter((email) => [CONTACT, DIRECTION].includes(email.mailboxKey))).toHaveLength(0);
  });

  it("un message de la direction est introuvable (404) pour l'admin, lisible par la direction", async () => {
    const email = await InboundEmail.findOne({ where: { mailboxKey: DIRECTION } });

    const asAdmin = await request(app).get(`/api/inbound-emails/${email.idInboundEmail}`).set("Cookie", cookies.admin);
    expect(asAdmin.status).toBe(404);

    const asDirection = await request(app)
      .get(`/api/inbound-emails/${email.idInboundEmail}`)
      .set("Cookie", cookies.direction);
    expect(asDirection.status).toBe(200);
    expect(asDirection.body.data.textBody).toContain("Confidentiel");
  });

  it("répond à l'expéditeur depuis contact@, dans le même fil", async () => {
    const email = await InboundEmail.findOne({ where: { mailboxKey: CONTACT } });
    const sent = [];
    setMailboxTransportFactory(() => ({
      sendMail: async (options) => {
        sent.push(options);
        return { messageId: "<reply@nbn>" };
      },
    }));

    const res = await request(app)
      .post(`/api/inbound-emails/${email.idInboundEmail}/reply`)
      .set("Cookie", cookies.communication)
      .send({ message: "Bonjour Madame, nous avons plusieurs appartements à Ibanda." });

    expect(res.status).toBe(201);
    expect(sent).toHaveLength(1);
    expect(sent[0].from).toContain("contact@nbnexpress.org");
    expect(sent[0].to).toEqual({ name: "Jeanne Mukendi", address: "jeanne@gmail.com" });
    expect(sent[0].subject).toBe("Re: Appartement à Ibanda");
    expect(sent[0].inReplyTo).toBe(email.messageId);
    expect(sent[0].text).toContain("> Bonjour, je cherche un appartement.");

    await email.reload();
    expect(email.repliedBy).toBe(users.communication.idUser);
  });

  it("refuse une réponse vide, et une réponse depuis une boîte sans SMTP", async () => {
    const contactEmail = await InboundEmail.findOne({ where: { mailboxKey: CONTACT } });
    const empty = await request(app)
      .post(`/api/inbound-emails/${contactEmail.idInboundEmail}/reply`)
      .set("Cookie", cookies.communication)
      .send({ message: "   " });
    expect(empty.status).toBe(400);

    const directionEmail = await InboundEmail.findOne({ where: { mailboxKey: DIRECTION } });
    const noSmtp = await request(app)
      .post(`/api/inbound-emails/${directionEmail.idInboundEmail}/reply`)
      .set("Cookie", cookies.direction)
      .send({ message: "Merci" });
    expect(noSmtp.status).toBe(409);
  });
});
