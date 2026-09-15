import { OutboxEvent } from "../models/index.model.js";
import { createSmtpTransport, sendMail, sendWithTimeout } from "../config/nodemailer.js";
import { getMailbox } from "../config/mailboxes.js";

// E-mails déclenchés par un événement métier (accusé de réception,
// notification d'équipe) : mis en file dans l'outbox plutôt qu'envoyés
// pendant la requête. La réponse au formulaire ne dépend jamais du serveur
// SMTP, et un envoi raté est retenté par le worker (services/outbox.worker.js)
// au lieu d'être perdu.
// `attachments` au format nodemailer, contenu en base64
// ({ filename, content, encoding: "base64", contentType }) : la charge utile
// est du JSON stocké en base, jamais un Buffer.
export const queueEmail = async ({ to, subject, html, text, replyTo, mailboxKey, attachments }) => {
  if (!to) return null;
  return OutboxEvent.create({
    eventType: "email:send",
    payload: JSON.stringify({ to, subject, html, text, replyTo, mailboxKey, attachments }),
  });
};

// Transport d'une boîte professionnelle (réponse « depuis contact@ »).
// Remplaçable en test : aucun test ne doit dépendre d'un vrai SMTP.
let mailboxTransportFactory = (mailbox) =>
  createSmtpTransport({
    host: mailbox.smtpHost,
    port: mailbox.smtpPort,
    secure: mailbox.smtpSecure,
    user: mailbox.user,
    pass: mailbox.password,
  });

export const setMailboxTransportFactory = (factory) => {
  mailboxTransportFactory = factory;
};

/**
 * Envoie depuis une boîte professionnelle : l'expéditeur est l'adresse de
 * la boîte, et une réponse du destinataire y revient naturellement.
 */
export const sendFromMailbox = async (mailboxKey, mailOptions) => {
  const mailbox = getMailbox(mailboxKey);
  if (!mailbox?.canSend) {
    throw new Error(`La boîte « ${mailboxKey} » n'est pas configurée pour l'envoi (SMTP).`);
  }
  return sendWithTimeout(mailboxTransportFactory(mailbox), {
    from: `"NBN Express" <${mailbox.address}>`,
    ...mailOptions,
  });
};

// Consommé par le worker outbox. Une boîte demandée mais non configurée
// retombe sur le transport applicatif : l'accusé de réception part quand
// même, simplement depuis l'expéditeur par défaut.
export const deliverQueuedEmail = async (payload) => {
  const { mailboxKey, ...mailOptions } = payload;
  if (mailboxKey && getMailbox(mailboxKey)?.canSend) {
    return sendFromMailbox(mailboxKey, mailOptions);
  }
  return sendMail(mailOptions);
};
