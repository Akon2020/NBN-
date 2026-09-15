import { Router } from "express";
import {
  exportCaisseLedger,
  exportCommissions,
  exportProperties,
  exportRentalRequests,
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
 * /api/reports/caisses/{id}/ledger:
 *   get:
 *     summary: Exporte le ledger d'une caisse sur une période (CSV ou Excel selon ?format=xlsx|csv, GOAL 10)
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, xlsx]
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
 *         description: Fichier généré
 *       404:
 *         description: Caisse non trouvée
 */
reportRouter.get(
  "/caisses/:id/ledger",
  authMiddlware,
  requirePermission("reports:read"),
  exportCaisseLedger
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

/**
 * @swagger
 * /api/reports/rental-requests:
 *   get:
 *     summary: Export des demandes de location, fiches supprimées comprises (date, auteur, motif)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [csv, xlsx] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *         description: Défaut — 30 jours avant `to`
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: deleted
 *         schema: { type: string, enum: [only] }
 *         description: "`only` pour n'exporter que les fiches supprimées"
 *     responses:
 *       200:
 *         description: Fichier CSV ou Excel
 *       403:
 *         description: Permission reports:read manquante
 */
reportRouter.get(
  "/rental-requests",
  authMiddlware,
  requirePermission("reports:read"),
  exportRentalRequests
);

export default reportRouter;
