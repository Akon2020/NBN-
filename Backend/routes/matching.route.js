import { Router } from "express";
import {
  createMatching,
  getMatchingsByClient,
  getMatchingsByProperty,
  updateMatchingStatut,
} from "../controllers/matching.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const matchingRouter = Router();

/**
 * @swagger
 * /api/matchings/client/{idClient}:
 *   get:
 *     summary: Liste les biens associés à un client (matching)
 *     tags: [Matchings]
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
matchingRouter.get(
  "/client/:idClient",
  authMiddlware,
  requirePermission("clients:read"),
  getMatchingsByClient
);

/**
 * @swagger
 * /api/matchings/property/{idProperty}:
 *   get:
 *     summary: Liste les clients associés à un bien (matching)
 *     tags: [Matchings]
 *     parameters:
 *       - in: path
 *         name: idProperty
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
matchingRouter.get(
  "/property/:idProperty",
  authMiddlware,
  requirePermission("clients:read"),
  getMatchingsByProperty
);

/**
 * @swagger
 * /api/matchings:
 *   post:
 *     summary: Associe un client à un bien (CDC §3 module 4)
 *     tags: [Matchings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idClient
 *               - idProperty
 *             properties:
 *               idClient:
 *                 type: integer
 *               idProperty:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Matching créé avec succès
 *       404:
 *         description: Client ou bien non trouvé
 */
matchingRouter.post(
  "/",
  authMiddlware,
  requirePermission("clients:manage"),
  createMatching
);

/**
 * @swagger
 * /api/matchings/{id}:
 *   patch:
 *     summary: Met à jour le statut d'un matching (EN_COURS/PROPOSE/VALIDE)
 *     tags: [Matchings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *       404:
 *         description: Matching non trouvé
 */
matchingRouter.patch(
  "/:id",
  authMiddlware,
  requirePermission("clients:manage"),
  updateMatchingStatut
);

export default matchingRouter;
