import { Router } from "express";
import {
  createRentalRequest,
  getAllRentalRequests,
  getSingleRentalRequest,
} from "../controllers/rentalRequest.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";
import { publicFormLimiter } from "../middlewares/rateLimit.middleware.js";

const rentalRequestRouter = Router();

/**
 * @swagger
 * /api/rental-requests:
 *   post:
 *     summary: Soumet une demande de location (formulaire public, aucune authentification) — crée/rattache un Client et le place sur le pipeline
 *     tags: [RentalRequests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, phone, conditionsAccepted]
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               conditionsAccepted:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Demande enregistrée
 *       400:
 *         description: Champs requis manquants ou conditions non acceptées
 *       429:
 *         description: Trop de soumissions depuis cet appareil
 */
rentalRequestRouter.post("/", publicFormLimiter, createRentalRequest);

/**
 * @swagger
 * /api/rental-requests:
 *   get:
 *     summary: Liste les demandes de location reçues (filtre `q` sur nom/téléphone)
 *     tags: [RentalRequests]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
rentalRequestRouter.get("/", authMiddlware, requirePermission("clients:read"), getAllRentalRequests);

/**
 * @swagger
 * /api/rental-requests/{id}:
 *   get:
 *     summary: Détail complet d'une demande de location
 *     tags: [RentalRequests]
 *     responses:
 *       200:
 *         description: Demande trouvée
 *       404:
 *         description: Demande non trouvée
 */
rentalRequestRouter.get(
  "/:id",
  authMiddlware,
  requirePermission("clients:read"),
  getSingleRentalRequest
);

export default rentalRequestRouter;
