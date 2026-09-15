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
 *             required: [fullName, phone, email, canalContact, typesBien, usageBien, ville, quartier, avenues, budgetMin, loyerMax, modalitePaiement, urgence, typeOccupants, elementsParticuliers, orienteParAgent, conditionsAccepted]
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *                 description: Normalisé au format international (0977… → +243977…). Refusé s'il est inexploitable.
 *               email:
 *                 type: string
 *                 description: Format vérifié, puis domaine vérifié par DNS (MX). Un DNS indisponible n'invalide pas l'adresse.
 *               canalContact:
 *                 type: string
 *                 enum: [TERRAIN, APPEL, WHATSAPP, RESEAU, AUTRE]
 *               typesBien:
 *                 type: array
 *                 items: { type: string }
 *               usageBien:
 *                 type: string
 *                 enum: [HABITATION, BUREAU, COMMERCIAL, MIXTE]
 *               ville:
 *                 type: string
 *                 enum: [BUKAVU, AUTRE]
 *               commune:
 *                 type: string
 *                 enum: [IBANDA, KADUTU, BAGIRA]
 *                 description: Requise si ville = BUKAVU.
 *               quartier:
 *                 type: string
 *                 description: Si ville = BUKAVU, doit appartenir à la commune (référentiel de l'agence).
 *               avenues:
 *                 type: string
 *               budgetMin:
 *                 type: number
 *               loyerMax:
 *                 type: number
 *                 description: Budget maximum, supérieur ou égal à budgetMin.
 *               modalitePaiement:
 *                 type: string
 *                 enum: [AVANCE_1_GARANTIE_3, MENSUEL, AVANCE_2_GARANTIE_3, AVANCE_3_GARANTIE_2, AVANCE_3_GARANTIE_3, GARANTIE_6, AUTRE]
 *               urgence:
 *                 type: string
 *                 enum: [IMMEDIAT, 1_2_SEMAINES, 1_MOIS, FLEXIBLE, AUTRE]
 *               typeOccupants:
 *                 type: string
 *                 enum: [FAMILLE_NOMBREUSE, FAMILLE_PEU_NOMBREUSE, COUPLE, AUTRE]
 *               nombreOccupants:
 *                 type: integer
 *                 description: Requis si typeOccupants = AUTRE.
 *               elementsParticuliers:
 *                 type: array
 *                 items: { type: string }
 *               orienteParAgent:
 *                 type: boolean
 *               codeCommissionnaire:
 *                 type: string
 *                 description: Requis si orienteParAgent. Format CCM-042 (variantes « ccm 42 » normalisées).
 *               conditionsAccepted:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Demande enregistrée
 *       400:
 *         description: Champ obligatoire manquant ou invalide (le message indique lequel), ou conditions non acceptées
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
