import cron from "node-cron";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { Op } from "sequelize";
import { InboundEmail, MailboxState, User } from "../models/index.model.js";
import { getMailboxes } from "../config/mailboxes.js";
import { INBOUND_MAIL_POLL_CRON } from "../config/env.js";
import { createNotification } from "./notification.service.js";

// Relève des boîtes professionnelles (contact@, direction@…) : chaque
// nouveau message devient une copie consultable sur le site et une
// notification pour l'audience de la boîte. La boîte n'est jamais modifiée
// (lecture seule, les messages restent « non lus » dans le webmail).

const MAX_MESSAGES_PER_POLL = 50;
const MAX_BODY_LENGTH = 20000;

// Client IMAP remplaçable en test : aucun test ne dépend d'un vrai serveur.
let imapClientFactory = (mailbox) =>
  new ImapFlow({
    host: mailbox.imapHost,
    port: mailbox.imapPort,
    secure: mailbox.imapSecure,
    auth: { user: mailbox.user, pass: mailbox.password },
    logger: false,
  });

export const setImapClientFactory = (factory) => {
  imapClientFactory = factory;
};

// --- Audience d'une boîte ---------------------------------------------------
// Règle contextuelle (CLAUDE.md §2.3), pas une permission : la boîte
// contact@ est visible par ses rôles, direction@ par la seule direction —
// l'admin n'y a pas accès par défaut, à la demande de l'agence.
const mailboxEmails = (mailbox) => [...mailbox.users, mailbox.address].filter(Boolean);

export const canAccessMailbox = (user, mailbox) =>
  Boolean(user) &&
  (mailbox.roles.includes(user.role) ||
    mailboxEmails(mailbox).includes(String(user.email ?? "").toLowerCase()));

export const accessibleMailboxes = (user) => getMailboxes().filter((mailbox) => canAccessMailbox(user, mailbox));

export const resolveMailboxAudience = async (mailbox) => {
  const conditions = [];
  if (mailbox.roles.length) conditions.push({ role: { [Op.in]: mailbox.roles } });
  const emails = mailboxEmails(mailbox);
  if (emails.length) conditions.push({ email: { [Op.in]: emails } });
  if (!conditions.length) return [];

  return User.findAll({
    where: { status: "ACTIVE", [Op.or]: conditions },
    attributes: ["idUser", "email", "role"],
  });
};

// --- Import d'un message ----------------------------------------------------
const plainTextOf = (parsed) => {
  const text =
    parsed.text ||
    String(parsed.html || "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ");
  return text.trim().slice(0, MAX_BODY_LENGTH);
};

const importMessage = async (mailbox, uid, uidValidity, parsed) => {
  const sender = parsed.from?.value?.[0] ?? {};
  const fromAddress = sender.address?.toLowerCase() || null;

  // Un message que la boîte s'envoie à elle-même (copie d'une réponse) ne
  // mérite pas de notification.
  if (fromAddress && fromAddress === mailbox.address) return null;

  const messageId = (parsed.messageId || `${mailbox.key}-${uidValidity}-${uid}`).slice(0, 255);
  const [email, created] = await InboundEmail.findOrCreate({
    where: { mailboxKey: mailbox.key, messageId },
    defaults: {
      mailboxAddress: mailbox.address,
      uid,
      fromName: sender.name?.slice(0, 255) || null,
      fromAddress,
      toAddresses: parsed.to?.text || null,
      subject: parsed.subject?.slice(0, 500) || "(sans objet)",
      textBody: plainTextOf(parsed),
      receivedAt: parsed.date || new Date(),
    },
  });
  if (!created) return null;

  const audience = await resolveMailboxAudience(mailbox);
  for (const user of audience) {
    await createNotification({
      idUser: user.idUser,
      type: "inbound_email:new",
      title: `Nouveau message sur ${mailbox.address}`,
      message: `${email.fromName || email.fromAddress || "Expéditeur inconnu"} : ${email.subject}`,
      relatedEntityType: "InboundEmail",
      relatedEntityId: email.idInboundEmail,
    });
  }
  return email;
};

// --- Relève -----------------------------------------------------------------
export const pollMailbox = async (mailbox) => {
  const client = imapClientFactory(mailbox);
  await client.connect();
  let lock;
  try {
    lock = await client.getMailboxLock("INBOX", { readOnly: true });
    const uidValidity = String(client.mailbox.uidValidity);
    const uidNext = Number(client.mailbox.uidNext);

    const [state] = await MailboxState.findOrCreate({ where: { mailboxKey: mailbox.key } });

    // Première relève (ou boîte renumérotée) : on part d'ici, sans inonder
    // l'équipe de notifications pour tout l'historique de la boîte.
    if (state.lastUid === null || state.uidValidity !== uidValidity) {
      await state.update({
        uidValidity,
        lastUid: Math.max(uidNext - 1, 0),
        lastPolledAt: new Date(),
        lastError: null,
      });
      return { imported: 0, baseline: true };
    }

    const lastUid = Number(state.lastUid);
    let highestUid = lastUid;
    let imported = 0;

    if (uidNext > lastUid + 1) {
      const parsedMessages = [];
      // Aucune autre commande IMAP pendant l'itération (contrainte imapflow) :
      // on collecte, puis on traite une fois le fetch terminé.
      for await (const message of client.fetch(`${lastUid + 1}:*`, { uid: true, source: true }, { uid: true })) {
        // `n:*` renvoie toujours au moins le dernier message, même ancien.
        if (message.uid <= lastUid) continue;
        parsedMessages.push(message);
      }

      parsedMessages.sort((a, b) => a.uid - b.uid);
      // Au-delà du plafond, le reste est traité à la relève suivante.
      for (const message of parsedMessages.slice(0, MAX_MESSAGES_PER_POLL)) {
        const parsed = await simpleParser(message.source);
        if (await importMessage(mailbox, message.uid, uidValidity, parsed)) imported += 1;
        highestUid = Math.max(highestUid, message.uid);
      }
    }

    await state.update({ lastUid: highestUid, lastPolledAt: new Date(), lastError: null });
    return { imported, baseline: false };
  } finally {
    lock?.release();
    await client.logout().catch(() => {});
  }
};

export const pollAllMailboxes = async () => {
  const results = {};
  for (const mailbox of getMailboxes().filter((m) => m.canReceive)) {
    try {
      results[mailbox.key] = await pollMailbox(mailbox);
    } catch (error) {
      // Journalise la cause technique, jamais les identifiants de la boîte.
      console.error(`Relève de la boîte ${mailbox.key} :`, error.message);
      await MailboxState.upsert({ mailboxKey: mailbox.key, lastError: error.message, lastPolledAt: new Date() });
      results[mailbox.key] = { error: error.message };
    }
  }
  return results;
};

let cronStarted = false;
let polling = false;

// Idempotent, même patron que les autres workers. Une relève encore en
// cours n'est jamais doublée par le tick suivant (IMAP lent sur cPanel).
export const startInboundMailCron = () => {
  if (cronStarted) return;
  cronStarted = true;
  cron.schedule(INBOUND_MAIL_POLL_CRON || "*/2 * * * *", async () => {
    if (polling) return;
    polling = true;
    try {
      await pollAllMailboxes();
    } finally {
      polling = false;
    }
  });
};
