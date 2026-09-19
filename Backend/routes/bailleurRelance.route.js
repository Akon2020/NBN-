import { Router } from "express";
import {
  cancelRelance,
  createRelance,
  getRelance,
  getRelances,
  markRelanceMessageSent,
} from "../controllers/bailleurRelance.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const bailleurRelanceRouter = Router();

/**
 * @swagger
 * /api/bailleur-relances:
 *   post:
 *     summary: Programme une relance (date, canal, message) pour une sélection de bailleurs
 *     description: >
 *       E-mail : envoi automatique depuis contact@ à la date prévue. WhatsApp :
 *       à la date prévue, les messages passent « À envoyer » et l'auteur est
 *       notifié (envoi en un clic, l'API WhatsApp Business n'étant pas activée).
 *       « {nom} » est personnalisé. Une date passée part immédiatement.
 *       Bailleurs injoignables par le canal écartés et renvoyés dans `skipped`.
 *     tags: [Bailleurs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [channel, idBailleurs, scheduledAt, message]
 *             properties:
 *               channel: { type: string, enum: [EMAIL, WHATSAPP] }
 *               idBailleurs: { type: array, items: { type: integer }, maxItems: 200 }
 *               scheduledAt: { type: string, format: date-time }
 *               subject: { type: string, description: "Requis pour EMAIL" }
 *               message: { type: string, maxLength: 5000 }
 *     responses:
 *       201:
 *         description: "{ idRelance, statut, recipients, skipped }"
 *       400:
 *         description: Données invalides ou aucun bailleur joignable par ce canal
 *   get:
 *     summary: Historique des relances avec le décompte des messages par statut
 *     tags: [Bailleurs]
 *     responses:
 *       200:
 *         description: Liste (100 dernières)
 */
bailleurRelanceRouter.post("/", authMiddlware, requirePermission("bailleurs:manage"), createRelance);
bailleurRelanceRouter.get("/", authMiddlware, requirePermission("bailleurs:read"), getRelances);

/**
 * @swagger
 * /api/bailleur-relances/messages/{idMessage}/sent:
 *   post:
 *     summary: Marque un message WhatsApp de relance comme envoyé par l'agent
 *     tags: [Bailleurs]
 *     responses:
 *       200:
 *         description: "{ remaining } — la relance est terminée quand il n'en reste plus"
 *       409:
 *         description: Message pas en attente d'envoi
 */
bailleurRelanceRouter.post(
  "/messages/:idMessage/sent",
  authMiddlware,
  requirePermission("bailleurs:manage"),
  markRelanceMessageSent
);

/**
 * @swagger
 * /api/bailleur-relances/{id}:
 *   get:
 *     summary: Détail d'une relance et de ses destinataires
 *     tags: [Bailleurs]
 *     responses:
 *       200:
 *         description: Relance trouvée
 *       404:
 *         description: Relance introuvable
 */
bailleurRelanceRouter.get("/:id", authMiddlware, requirePermission("bailleurs:read"), getRelance);

/**
 * @swagger
 * /api/bailleur-relances/{id}/cancel:
 *   post:
 *     summary: Annule une relance encore planifiée
 *     tags: [Bailleurs]
 *     responses:
 *       200:
 *         description: Relance annulée
 *       409:
 *         description: Relance déjà traitée
 */
bailleurRelanceRouter.post("/:id/cancel", authMiddlware, requirePermission("bailleurs:manage"), cancelRelance);

export default bailleurRelanceRouter;
