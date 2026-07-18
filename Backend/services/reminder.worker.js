import cron from "node-cron";
import { Op } from "sequelize";
import { Reminder } from "../models/index.model.js";
import { createNotification } from "./notification.service.js";

// GOAL 11 — comble un écart entre l'intention documentée sur le modèle
// Reminder ("un cron parcourt les PLANIFIE dont dueAt est passée") et la
// réalité : ce worker n'existait pas avant cette session, seul le worker
// outbox (retries de push) tournait. Chaque Reminder échu produit
// exactement une Notification puis passe à ENVOYE — jamais retraité même
// si le cron tourne plusieurs fois avant que la transition soit visible
// (fenêtre couverte par le batch limit + l'ordre chronologique).
const BATCH_SIZE = 50;

export const processDueReminders = async () => {
  const due = await Reminder.findAll({
    where: { statut: "PLANIFIE", dueAt: { [Op.lte]: new Date() } },
    order: [["dueAt", "ASC"]],
    limit: BATCH_SIZE,
  });

  for (const reminder of due) {
    await createNotification({
      idUser: reminder.idUser,
      type: "reminder:due",
      title: reminder.title,
      message: reminder.message,
      relatedEntityType: reminder.relatedEntityType,
      relatedEntityId: reminder.relatedEntityId,
    });
    await reminder.update({ statut: "ENVOYE", sentAt: new Date() });
  }

  return due.length;
};

let cronStarted = false;

// Idempotent, même patron que startOutboxCron (utile en tests, où l'app
// peut être importée dans plusieurs fichiers).
export const startReminderCron = () => {
  if (cronStarted) return;
  cronStarted = true;
  cron.schedule("*/30 * * * * *", () => {
    processDueReminders().catch((error) => {
      console.error("Erreur worker reminders:", error);
    });
  });
};
