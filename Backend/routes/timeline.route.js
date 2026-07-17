import { Router } from "express";
import { getEntityTimeline } from "../controllers/timeline.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";

const timelineRouter = Router();

/**
 * @swagger
 * /api/timeline/{entityType}/{entityId}:
 *   get:
 *     summary: Historique chronologique d'une entité (PROPERTY/CLIENT/COMMISSIONNAIRE/BAILLEUR), filtrable par eventType/from/to
 *     tags: [Timeline]
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [PROPERTY, CLIENT, COMMISSIONNAIRE, BAILLEUR]
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
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
 *         description: Timeline récupérée avec succès
 *       400:
 *         description: entityType invalide
 *       403:
 *         description: Permissions insuffisantes
 */
timelineRouter.get("/:entityType/:entityId", authMiddlware, getEntityTimeline);

export default timelineRouter;
