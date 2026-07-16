import { Router } from "express";
import {
  exportCommissions,
  exportProperties,
  getCaisseStatementPdf,
} from "../controllers/report.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const reportRouter = Router();

/**
 * @swagger
 * /api/reports/caisses/{id}/etat.pdf:
 *   get:
 *     summary: Génère l'état de caisse (PDF, à la demande) pour une période donnée
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: PDF généré
 *       404:
 *         description: Caisse non trouvée
 */
reportRouter.get(
  "/caisses/:id/etat.pdf",
  authMiddlware,
  requirePermission("reports:read"),
  getCaisseStatementPdf
);

/**
 * @swagger
 * /api/reports/properties:
 *   get:
 *     summary: Exporte le catalogue de biens (CSV ou Excel selon ?format=xlsx|csv), respecte le field-level authorization (margin)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, xlsx]
 *     responses:
 *       200:
 *         description: Fichier généré
 */
reportRouter.get(
  "/properties",
  authMiddlware,
  requirePermission("reports:read"),
  exportProperties
);

/**
 * @swagger
 * /api/reports/commissions:
 *   get:
 *     summary: Exporte les commissions sur une période (CSV ou Excel selon ?format=xlsx|csv)
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Fichier généré
 */
reportRouter.get(
  "/commissions",
  authMiddlware,
  requirePermission("reports:read"),
  exportCommissions
);

export default reportRouter;
