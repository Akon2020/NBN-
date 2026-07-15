import { Router } from "express";
import {
  createCommission,
  getAllCommissions,
  markCommissionDue,
} from "../controllers/commission.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const commissionRouter = Router();

/**
 * @swagger
 * /api/commissions:
 *   get:
 *     summary: Liste les commissions (filtres statut/beneficiaireType/idCommissionnaire)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
commissionRouter.get(
  "/",
  authMiddlware,
  requirePermission("commissions:read"),
  getAllCommissions
);

/**
 * @swagger
 * /api/commissions:
 *   post:
 *     summary: Calcule une commission (agence/agent/commissionnaire) à partir d'une transaction conclue
 *     tags: [Treasury]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idClient
 *               - beneficiaireType
 *               - montantTransaction
 *               - currencyCode
 *             properties:
 *               idClient:
 *                 type: integer
 *               idProperty:
 *                 type: integer
 *               beneficiaireType:
 *                 type: string
 *                 enum: [AGENCE, AGENT, COMMISSIONNAIRE]
 *               beneficiaireUserId:
 *                 type: integer
 *               montantTransaction:
 *                 type: number
 *               currencyCode:
 *                 type: string
 *               tauxCommission:
 *                 type: number
 *               montantCommission:
 *                 type: number
 *     responses:
 *       201:
 *         description: Commission calculée avec succès
 *       400:
 *         description: Données invalides ou transaction non conclue
 */
commissionRouter.post(
  "/",
  authMiddlware,
  requirePermission("commissions:manage"),
  createCommission
);

/**
 * @swagger
 * /api/commissions/{id}/marquer-due:
 *   patch:
 *     summary: Marque une commission comme due, désigne la caisse qui la décaissera
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Commission marquée due
 */
commissionRouter.patch(
  "/:id/marquer-due",
  authMiddlware,
  requirePermission("commissions:manage"),
  markCommissionDue
);

export default commissionRouter;
