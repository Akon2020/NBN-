import { Router } from "express";
import {
  assignAlert,
  createManualAlert,
  getAllAlerts,
  transitionAlertStatus,
} from "../controllers/alert.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const alertRouter = Router();

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Liste les alertes (filtres statut/severite)
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
alertRouter.get("/", authMiddlware, requirePermission("alerts:read"), getAllAlerts);

/**
 * @swagger
 * /api/alerts:
 *   post:
 *     summary: Crée une alerte manuelle
 *     tags: [Alerts]
 *     responses:
 *       201:
 *         description: Alerte créée avec succès
 *       400:
 *         description: type ou title manquant
 */
alertRouter.post("/", authMiddlware, requirePermission("alerts:manage"), createManualAlert);

/**
 * @swagger
 * /api/alerts/{id}/statut:
 *   patch:
 *     summary: Change le statut d'une alerte (cycle de vie ouverte→...→clôturée), notifie le responsable
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: Alerte mise à jour
 *       400:
 *         description: Statut invalide
 */
alertRouter.patch(
  "/:id/statut",
  authMiddlware,
  requirePermission("alerts:manage"),
  transitionAlertStatus
);

/**
 * @swagger
 * /api/alerts/{id}/assigner:
 *   patch:
 *     summary: Assigne une alerte à un responsable
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: Alerte assignée
 */
alertRouter.patch("/:id/assigner", authMiddlware, requirePermission("alerts:manage"), assignAlert);

export default alertRouter;
