import { describe, it, expect, afterAll, afterEach } from "vitest";
import { OutboxEvent } from "../models/index.model.js";
import {
  deliverQueuedEmail,
  queueEmail,
  sendFromMailbox,
  setMailboxTransportFactory,
} from "../services/email.service.js";

const createdEventIds = [];
const savedEnv = { ...process.env };

// Transport factice : capture ce qui aurait été envoyé, sans réseau.
const captureTransport = (sent) => () => ({
  sendMail: async (options) => {
    sent.push(options);
    return { messageId: "<test@nbn>" };
  },
});

afterEach(() => {
  process.env = { ...savedEnv };
});

afterAll(async () => {
  if (createdEventIds.length) {
    await OutboxEvent.destroy({ where: { idOutboxEvent: createdEventIds } });
  }
});

describe("E-mails mis en file", () => {
  it("un e-mail métier passe par l'outbox au lieu d'être envoyé pendant la requête", async () => {
    const event = await queueEmail({
      to: "client@gmail.com",
      subject: "Avis de réception",
      html: "<p>Bonjour</p>",
      mailboxKey: "contact",
    });
    createdEventIds.push(event.idOutboxEvent);

    expect(event.eventType).toBe("email:send");
    expect(event.statut).toBe("PENDING");
    expect(JSON.parse(event.payload)).toMatchObject({ to: "client@gmail.com", mailboxKey: "contact" });
  });

  it("ne met rien en file sans destinataire", async () => {
    await expect(queueEmail({ to: "", subject: "x" })).resolves.toBeNull();
  });

  it("envoie depuis la boîte professionnelle quand elle est configurée", async () => {
    process.env.MAILBOXES = "contact";
    process.env.MAILBOX_CONTACT_ADDRESS = "contact@nbnexpress.org";
    process.env.MAILBOX_CONTACT_PASSWORD = "secret";
    process.env.MAILBOX_CONTACT_SMTP_HOST = "mail.nbnexpress.org";

    const sent = [];
    setMailboxTransportFactory(captureTransport(sent));

    await deliverQueuedEmail({ to: "client@gmail.com", subject: "Avis", html: "<p>x</p>", mailboxKey: "contact" });

    expect(sent).toHaveLength(1);
    expect(sent[0].from).toContain("contact@nbnexpress.org");
    expect(sent[0].to).toBe("client@gmail.com");
  });

  it("refuse de répondre depuis une boîte sans identifiants SMTP", async () => {
    process.env.MAILBOXES = "direction";
    process.env.MAILBOX_DIRECTION_ADDRESS = "direction@nbnexpress.org";

    await expect(sendFromMailbox("direction", { to: "x@gmail.com" })).rejects.toThrow(/pas configurée/);
  });
});
