import cron from "node-cron";
import { Op } from "sequelize";
import { Bailleur, BailleurMessage, BailleurRelance, Person } from "../models/index.model.js";
import { queueEmail } from "./email.service.js";
import { createNotification } from "./notification.service.js";
import { bailleurMessageEmail } from "../utils/formEmail.templates.js";

const BATCH_SIZE = 20;

/**
 * Exécute une relance arrivée à échéance.
 * - E-mail : chaque message part automatiquement depuis contact@ (outbox,
 *   retenté en cas d'échec) ; la relance est terminée.
 * - WhatsApp : l'envoi automatique exige l'API WhatsApp Business (non
 *   activée) ; les messages passent « À envoyer » et l'auteur de la relance
 *   est notifié, avec chaque message prêt à ouvrir en un clic.
 */
export const processRelance = async (relance) => {
  const messages = await BailleurMessage.findAll({
    where: { idRelance: relance.idRelance, statut: "PLANIFIE" },
    include: [
      {
        model: Bailleur,
        as: "bailleur",
        include: [{ model: Person, as: "person", attributes: ["fullName", "email", "phone"] }],
      },
    ],
  });
  const now = new Date();

  if (relance.channel === "EMAIL") {
    for (const message of messages) {
      const email = message.bailleur?.person?.email;
      if (!email) {
        await message.update({ statut: "ECHEC" });
        continue;
      }
      const event = await queueEmail({
        to: email,
        subject: message.subject,
        text: message.body,
        mailboxKey: "contact",
        ...bailleurMessageEmail({ body: message.body }),
      });
      await message.update({ statut: "ENVOYE", idOutboxEvent: event.idOutboxEvent, sentAt: now });
      await message.bailleur.update({ dernierContact: now });
    }
    await relance.update({ statut: "TERMINEE", processedAt: now });
    return { channel: "EMAIL", sent: messages.length };
  }

  await BailleurMessage.update(
    { statut: "A_ENVOYER" },
    { where: { idRelance: relance.idRelance, statut: "PLANIFIE" } }
  );
  await relance.update({ statut: messages.length ? "EN_COURS" : "TERMINEE", processedAt: now });
  if (relance.createdBy && messages.length) {
    await createNotification({
      idUser: relance.createdBy,
      type: "bailleur_relance:whatsapp",
      title: `Relance WhatsApp à envoyer — ${messages.length} bailleur(s)`,
      message: "Les messages sont prêts : ouvrez la relance et envoyez-les en un clic.",
      relatedEntityType: "BailleurRelance",
      relatedEntityId: relance.idRelance,
    });
  }
  return { channel: "WHATSAPP", ready: messages.length };
};

/**
 * Relances échues. Chaque relance est « réservée » (PLANIFIEE → EN_COURS en
 * une requête conditionnelle) avant d'être traitée : deux passages du cron qui
 * se chevauchent n'envoient jamais deux fois la même relance.
 */
export const processDueRelances = async (now = new Date()) => {
  const due = await BailleurRelance.findAll({
    where: { statut: "PLANIFIEE", scheduledAt: { [Op.lte]: now } },
    order: [["scheduledAt", "ASC"]],
    limit: BATCH_SIZE,
  });

  let processed = 0;
  for (const relance of due) {
    const [claimed] = await BailleurRelance.update(
      { statut: "EN_COURS" },
      { where: { idRelance: relance.idRelance, statut: "PLANIFIEE" } }
    );
    if (!claimed) continue;
    await processRelance(relance);
    processed += 1;
  }
  return processed;
};

let cronStarted = false;
let running = false;

// Toutes les minutes : une relance part au plus une minute après l'heure
// prévue. Idempotent, sans chevauchement (même patron que les autres workers).
export const startBailleurRelanceCron = () => {
  if (cronStarted) return;
  cronStarted = true;
  cron.schedule("* * * * *", async () => {
    if (running) return;
    running = true;
    try {
      await processDueRelances();
    } catch (error) {
      console.error("Erreur worker relances bailleurs:", error.message);
    } finally {
      running = false;
    }
  });
};
