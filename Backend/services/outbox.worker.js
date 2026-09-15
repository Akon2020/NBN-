import cron from "node-cron";
import { Op } from "sequelize";
import { OutboxEvent } from "../models/index.model.js";
import { deliverNotificationPush } from "./notification.service.js";
import { deliverQueuedEmail } from "./email.service.js";

// CLAUDE.md §7 — outbox pattern : ce worker retente les tentatives de
// push en attente/échouées, garantissant qu'un push raté n'est jamais
// silencieusement perdu. La Notification (source de vérité) existe déjà
// en base indépendamment du sort de cette tentative — un push qui échoue
// définitivement ne fait jamais disparaître l'information, seulement le
// canal de diffusion immédiat.
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 20;

// `ids` restreint le passage à des événements précis (tests d'intégration :
// la table est partagée par des fichiers qui tournent en parallèle, un test
// ne doit ni dépendre de l'arriéré des autres ni le consommer). Sans
// argument, le cron traite le lot habituel.
export const processOutboxEvents = async ({ ids } = {}) => {
  const pending = await OutboxEvent.findAll({
    where: {
      statut: { [Op.in]: ["PENDING", "FAILED"] },
      attempts: { [Op.lt]: MAX_ATTEMPTS },
      ...(ids ? { idOutboxEvent: { [Op.in]: ids } } : {}),
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
      } else if (event.eventType === "email:send") {
        // Une exception (SMTP injoignable, délai dépassé) est rattrapée plus
        // bas : l'événement passe FAILED et sera retenté.
        await deliverQueuedEmail(JSON.parse(event.payload));
        await event.update({
          statut: "SENT",
          attempts: event.attempts + 1,
          processedAt: new Date(),
          lastError: null,
        });
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
