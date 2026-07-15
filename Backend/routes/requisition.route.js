import { Router } from "express";
import {
  approveRequisition,
  createRequisition,
  getAllRequisitions,
  getMyRequisitions,
  getRequisitionPdf,
  rejectRequisition,
  requestRequisitionComplement,
} from "../controllers/requisition.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const requisitionRouter = Router();

/**
 * @swagger
 * /api/requisitions/mine:
 *   get:
 *     summary: Liste les réquisitions soumises par l'utilisateur connecté
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
requisitionRouter.get(
  "/mine",
  authMiddlware,
  requirePermission("requisitions:create"),
  getMyRequisitions
);

/**
 * @swagger
 * /api/requisitions:
 *   get:
 *     summary: Liste toutes les réquisitions (filtres statut/idCaisse/from/to pour l'audit)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
requisitionRouter.get(
  "/",
  authMiddlware,
  requirePermission("requisitions:read"),
  getAllRequisitions
);

/**
 * @swagger
 * /api/requisitions:
 *   post:
 *     summary: Soumet une réquisition de fonds (Saisie + Vérification automatique, info.md §6)
 *     tags: [Treasury]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idCaisse
 *               - nature
 *               - coutEstime
 *               - currencyCode
 *             properties:
 *               idCaisse:
 *                 type: integer
 *               nature:
 *                 type: string
 *               quantite:
 *                 type: integer
 *               coutEstime:
 *                 type: number
 *               currencyCode:
 *                 type: string
 *               justificatif:
 *                 type: string
 *     responses:
 *       201:
 *         description: Réquisition soumise avec succès
 *       400:
 *         description: Champs manquants ou conformité budgétaire non respectée
 */
requisitionRouter.post(
  "/",
  authMiddlware,
  requirePermission("requisitions:create"),
  createRequisition
);

/**
 * @swagger
 * /api/requisitions/{id}/approuver:
 *   patch:
 *     summary: Approuve une réquisition (génère le code de validation unique)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Réquisition approuvée
 */
requisitionRouter.patch(
  "/:id/approuver",
  authMiddlware,
  requirePermission("requisitions:validate"),
  approveRequisition
);

/**
 * @swagger
 * /api/requisitions/{id}/rejeter:
 *   patch:
 *     summary: Rejette une réquisition (motif obligatoire)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Réquisition rejetée
 *       400:
 *         description: Motif manquant
 */
requisitionRouter.patch(
  "/:id/rejeter",
  authMiddlware,
  requirePermission("requisitions:validate"),
  rejectRequisition
);

/**
 * @swagger
 * /api/requisitions/{id}/demander-complement:
 *   patch:
 *     summary: Demande un complément d'information (motif obligatoire)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Complément demandé
 *       400:
 *         description: Motif manquant
 */
requisitionRouter.patch(
  "/:id/demander-complement",
  authMiddlware,
  requirePermission("requisitions:validate"),
  requestRequisitionComplement
);

/**
 * @swagger
 * /api/requisitions/{id}/pdf:
 *   get:
 *     summary: Génère le document PDF de la réquisition approuvée (info.md §6, étape Génération)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: PDF généré
 *       400:
 *         description: La réquisition n'est pas approuvée
 */
requisitionRouter.get(
  "/:id/pdf",
  authMiddlware,
  requirePermission("requisitions:read"),
  getRequisitionPdf
);

export default requisitionRouter;
