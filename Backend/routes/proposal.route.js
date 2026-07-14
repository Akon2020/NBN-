import { Router } from "express";
import {
  createProposal,
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
 *     summary: Liste les propositions envoyées à un client
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

export default proposalRouter;
