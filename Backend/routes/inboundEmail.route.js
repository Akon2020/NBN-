import { Router } from "express";
import {
  getInboundEmail,
  getInboundEmails,
  getMailboxAudiences,
  getMyMailboxes,
  replyToInboundEmail,
  resetMailboxAudience,
  updateMailboxAudience,
} from "../controllers/inboundEmail.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";

const inboundEmailRouter = Router();

// Pas de requirePermission ici : l'accès dépend de l'audience de chaque
// boîte (MAILBOX_<CLÉ>_ROLES / _USERS), vérifiée dans le contrôleur à chaque
// lecture et chaque réponse.

/**
 * @swagger
 * /api/inbound-emails/mailboxes:
 *   get:
 *     summary: Boîtes professionnelles dont l'utilisateur fait partie de l'audience
 *     tags: [InboundEmails]
 *     responses:
 *       200:
 *         description: "Liste { key, label, address, canSend, canReceive }"
 */
inboundEmailRouter.get("/mailboxes", authMiddlware, getMyMailboxes);

/**
 * @swagger
 * /api/inbound-emails/mailboxes/audiences:
 *   get:
 *     summary: Audience (rôles et comptes destinataires) des boîtes dont l'utilisateur est membre
 *     tags: [InboundEmails]
 *     responses:
 *       200:
 *         description: "Liste { key, label, address, roles, users, source: env|settings }"
 */
inboundEmailRouter.get("/mailboxes/audiences", authMiddlware, getMailboxAudiences);

/**
 * @swagger
 * /api/inbound-emails/mailboxes/{key}/audience:
 *   put:
 *     summary: Règle qui reçoit et lit les messages d'une boîte (membres de la boîte uniquement)
 *     tags: [InboundEmails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roles, users]
 *             properties:
 *               roles:
 *                 type: array
 *                 items: { type: string }
 *                 description: Rôles du catalogue
 *               users:
 *                 type: array
 *                 items: { type: string, format: email }
 *                 description: Comptes en plus (50 max)
 *     responses:
 *       200:
 *         description: Audience enregistrée (prioritaire sur MAILBOX_<CLÉ>_ROLES / _USERS)
 *       400:
 *         description: Rôle inconnu, adresse invalide, audience vide, ou l'auteur s'en retirerait
 *       404:
 *         description: Boîte inexistante ou dont l'utilisateur n'est pas membre
 *   delete:
 *     summary: Rétablit l'audience déclarée sur le serveur
 *     tags: [InboundEmails]
 *     responses:
 *       200:
 *         description: Réglage du serveur rétabli
 *       400:
 *         description: Le réglage du serveur n'inclut pas l'auteur
 *       404:
 *         description: Boîte inexistante ou dont l'utilisateur n'est pas membre
 */
inboundEmailRouter.put("/mailboxes/:key/audience", authMiddlware, updateMailboxAudience);
inboundEmailRouter.delete("/mailboxes/:key/audience", authMiddlware, resetMailboxAudience);

/**
 * @swagger
 * /api/inbound-emails:
 *   get:
 *     summary: Messages reçus sur les boîtes accessibles à l'utilisateur (sans le corps)
 *     tags: [InboundEmails]
 *     parameters:
 *       - in: query
 *         name: mailbox
 *         schema: { type: string }
 *         description: Clé de boîte (ignorée si hors audience)
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Recherche sur l'objet et l'expéditeur
 *     responses:
 *       200:
 *         description: Liste (200 messages max, plus récents d'abord)
 */
inboundEmailRouter.get("/", authMiddlware, getInboundEmails);

/**
 * @swagger
 * /api/inbound-emails/{id}:
 *   get:
 *     summary: Détail d'un message reçu, avec ses réponses et `canReply`
 *     tags: [InboundEmails]
 *     responses:
 *       200:
 *         description: Message trouvé
 *       404:
 *         description: Message inexistant ou hors de l'audience de l'utilisateur
 */
inboundEmailRouter.get("/:id", authMiddlware, getInboundEmail);

/**
 * @swagger
 * /api/inbound-emails/{id}/reply:
 *   post:
 *     summary: Répond à l'expéditeur depuis la boîte qui a reçu le message
 *     tags: [InboundEmails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Réponse envoyée (message d'origine cité, en-têtes de fil In-Reply-To/References)
 *       400:
 *         description: Réponse vide ou trop longue
 *       404:
 *         description: Message inexistant ou hors de l'audience
 *       409:
 *         description: Boîte non configurée pour l'envoi (SMTP)
 *       502:
 *         description: Échec d'envoi (tracé dans l'historique des réponses)
 */
inboundEmailRouter.post("/:id/reply", authMiddlware, replyToInboundEmail);

export default inboundEmailRouter;
