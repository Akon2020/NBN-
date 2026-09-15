import { Router } from "express";
import {
  getBailleurMessages,
  logBailleurContact,
  sendBailleurEmails,
} from "../controllers/bailleurMessage.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const bailleurMessageRouter = Router();

/**
 * @swagger
 * /api/bailleur-messages/emails:
 *   post:
 *     summary: « Emails » — envoie un message à une sélection de bailleurs depuis contact@
 *     description: >
 *       Mis en file (outbox), tracé dans l'historique de chaque bailleur,
 *       dernier contact mis à jour. « {nom} » est remplacé par le nom du
 *       destinataire dans l'objet et le message.
 *     tags: [Bailleurs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idBailleurs, subject, message]
 *             properties:
 *               idBailleurs: { type: array, items: { type: integer }, maxItems: 100 }
 *               subject: { type: string, maxLength: 200 }
 *               message: { type: string, maxLength: 10000 }
 *     responses:
 *       201:
 *         description: "{ sent, withoutEmail } — withoutEmail liste les bailleurs sans adresse"
 *       400:
 *         description: Sélection, objet ou message manquant
 *       403:
 *         description: Permission bailleurs:manage manquante
 */
bailleurMessageRouter.post("/emails", authMiddlware, requirePermission("bailleurs:manage"), sendBailleurEmails);

/**
 * @swagger
 * /api/bailleur-messages/contact-log:
 *   post:
 *     summary: « Contacts » — trace un appel, WhatsApp, SMS ou e-mail lancé depuis le site
 *     tags: [Bailleurs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idBailleur, channel]
 *             properties:
 *               idBailleur: { type: integer }
 *               channel: { type: string, enum: [APPEL, WHATSAPP, SMS, EMAIL] }
 *               body: { type: string }
 *     responses:
 *       201:
 *         description: Contact enregistré, dernier contact mis à jour
 */
bailleurMessageRouter.post(
  "/contact-log",
  authMiddlware,
  requirePermission("bailleurs:manage"),
  logBailleurContact
);

/**
 * @swagger
 * /api/bailleur-messages/bailleur/{idBailleur}:
 *   get:
 *     summary: Historique des échanges d'un bailleur (envoyés et reçus)
 *     description: >
 *       `received` ne contient que les messages reçus sur les boîtes
 *       professionnelles dont l'utilisateur fait partie de l'audience.
 *     tags: [Bailleurs]
 *     responses:
 *       200:
 *         description: "{ sent, received }"
 */
bailleurMessageRouter.get(
  "/bailleur/:idBailleur",
  authMiddlware,
  requirePermission("bailleurs:read"),
  getBailleurMessages
);

export default bailleurMessageRouter;
