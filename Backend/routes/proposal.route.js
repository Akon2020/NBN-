import { Router } from "express";
import {
  createProposal,
  createProposalBatch,
  getAllProposals,
  getProposalsByClient,
} from "../controllers/proposal.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const proposalRouter = Router();

/**
 * @swagger
 * /api/proposals:
 *   get:
 *     summary: Liste toutes les propositions envoyées
 *     tags: [Proposals]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
proposalRouter.get("/", authMiddlware, requirePermission("clients:read"), getAllProposals);

/**
 * @swagger
 * /api/proposals/client/{idClient}:
 *   get:
 *     summary: Liste les propositions envoyées à un client (plus récentes d'abord)
 *     description: >
 *       Chaque proposition inclut le bien tel que proposé (type, localisation,
 *       composition, prix, première image) et l'expéditeur. Jamais le
 *       bailleur, le prix minimum, la marge ni l'informateur.
 *     tags: [Proposals]
 *     parameters:
 *       - in: path
 *         name: idClient
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
proposalRouter.get(
  "/client/:idClient",
  authMiddlware,
  requirePermission("clients:read"),
  getProposalsByClient
);

/**
 * @swagger
 * /api/proposals:
 *   post:
 *     summary: Enregistre l'envoi d'une proposition à un client (bouton "Proposer")
 *     tags: [Proposals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idProperty
 *               - idClient
 *             properties:
 *               idProperty:
 *                 type: integer
 *               idClient:
 *                 type: integer
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Proposition enregistrée avec succès
 *       404:
 *         description: Bien ou client non trouvé
 */
proposalRouter.post(
  "/",
  authMiddlware,
  requirePermission("clients:manage"),
  createProposal
);

/**
 * @swagger
 * /api/proposals/batch:
 *   post:
 *     summary: Enregistre l'envoi d'une sélection de biens (panier) à un client
 *     description: >
 *       Une proposition par bien, dans une transaction. Un client au statut
 *       NOUVEAU passe à PROPOSE ; un dossier plus avancé ne change pas.
 *     tags: [Proposals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idClient, idProperties]
 *             properties:
 *               idClient: { type: integer }
 *               idProperties:
 *                 type: array
 *                 items: { type: integer }
 *                 maxItems: 20
 *               channel:
 *                 type: string
 *                 enum: [WHATSAPP, EMAIL, AUTRE]
 *               message: { type: string }
 *     responses:
 *       201:
 *         description: "{ created, total, pipelineAdvanced }"
 *       400:
 *         description: Client ou biens manquants, trop de biens, canal invalide
 *       404:
 *         description: Client ou bien introuvable
 */
proposalRouter.post(
  "/batch",
  authMiddlware,
  requirePermission("clients:manage"),
  createProposalBatch
);

export default proposalRouter;
