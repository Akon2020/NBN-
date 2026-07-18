import { Router } from "express";
import {
  getMarginHistory,
  getMarginSettings,
  updateMarginSetting,
} from "../controllers/marginSetting.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const marginSettingRouter = Router();

/**
 * @swagger
 * /api/margin-settings:
 *   get:
 *     summary: Liste les pourcentages de marge par défaut par type de bien et type de séjour (GOAL 9, GOAL 12)
 *     tags: [MarginSettings]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
marginSettingRouter.get(
  "/",
  authMiddlware,
  requirePermission("property:margin:read"),
  getMarginSettings
);

/**
 * @swagger
 * /api/margin-settings/history:
 *   get:
 *     summary: Historique des changements de marge (globaux et par bien, GOAL 9)
 *     tags: [MarginSettings]
 *     responses:
 *       200:
 *         description: Historique récupéré avec succès
 */
marginSettingRouter.get(
  "/history",
  authMiddlware,
  requirePermission("property:margin:read"),
  getMarginHistory
);

/**
 * @swagger
 * /api/margin-settings/{propertyType}:
 *   patch:
 *     summary: Change le pourcentage de marge par défaut d'un type de bien pour un type de séjour donné (GOAL 9, GOAL 12) — recalcule tous les biens concernés sans override
 *     tags: [MarginSettings]
 *     parameters:
 *       - in: path
 *         name: propertyType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [APPARTEMENT, MAISON, CONSTRUCTION_DURABLE, CONSTRUCTION_SEMI_DURABLE, TERRAIN_PLAT, TERRAIN_PENTE]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [percentage, stayType]
 *             properties:
 *               percentage:
 *                 type: number
 *               stayType:
 *                 type: string
 *                 enum: [LONGUE_DUREE, COURT_SEJOUR]
 *     responses:
 *       200:
 *         description: Pourcentage mis à jour
 *       400:
 *         description: Pourcentage invalide ou déjà appliqué
 *       404:
 *         description: Type de bien/séjour non trouvé
 */
marginSettingRouter.patch(
  "/:propertyType",
  authMiddlware,
  requirePermission("property:margin:manage"),
  updateMarginSetting
);

export default marginSettingRouter;
