import cron from "node-cron";
import { Op } from "sequelize";
import { OutboxEvent } from "../models/index.model.js";
import { deliverNotificationPush } from "./notification.service.js";

// CLAUDE.md §7 — outbox pattern : ce worker retente les tentatives de
// push en attente/échouées, garantissant qu'un push raté n'est jamais
// silencieusement perdu. La Notification (source de vérité) existe déjà
// en base indépendamment du sort de cette tentative — un push qui échoue
// définitivement ne fait jamais disparaître l'information, seulement le
// canal de diffusion immédiat.
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 20;

export const processOutboxEvents = async () => {
  const pending = await OutboxEvent.findAll({
    where: {
      statut: { [Op.in]: ["PENDING", "FAILED"] },
      attempts: { [Op.lt]: MAX_ATTEMPTS },
    },
    limit: BATCH_SIZE,
    order: [["createdAt", "ASC"]],
  });

  for (const event of pending) {
    await event.update({ statut: "PROCESSING" });

    try {
      if (event.eventType === "notification:push") {
        const { idNotification } = JSON.parse(event.payload);
        const result = await deliverNotificationPush(idNotification);

        if (result.status === "SENT" || result.status === "SKIPPED") {
          await event.update({
            statut: "SENT",
            attempts: event.attempts + 1,
            processedAt: new Date(),
            lastError: result.status === "SKIPPED" ? result.error : null,
          });
        } else {
          await event.update({
            statut: "FAILED",
            attempts: event.attempts + 1,
            lastError: result.error || "Échec inconnu",
          });
        }
      } else {
        await event.update({
          statut: "FAILED",
          attempts: event.attempts + 1,
          lastError: `Type d'événement outbox inconnu : ${event.eventType}`,
        });
      }
    } catch (error) {
      await event.update({
        statut: "FAILED",
        attempts: event.attempts + 1,
        lastError: error.message,
      });
    }
  }

  return pending.length;
};

let cronStarted = false;

// Idempotent — un seul cron actif même si appelé plusieurs fois (utile en
// tests, où l'app peut être importée dans plusieurs fichiers).
export const startOutboxCron = () => {
  if (cronStarted) return;
  cronStarted = true;
  cron.schedule("*/30 * * * * *", () => {
    processOutboxEvents().catch((error) => {
      console.error("Erreur worker outbox:", error);
    });
  });
};
