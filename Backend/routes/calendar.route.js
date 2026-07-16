import { Router } from "express";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
} from "../controllers/calendar.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const calendarRouter = Router();

/**
 * @swagger
 * /api/calendar:
 *   get:
 *     summary: Vue calendrier agrégée (tâches, rappels, relances client, rendez-vous) sur une période
 *     tags: [Calendar]
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
 *         description: Liste récupérée avec succès
 */
calendarRouter.get("/", authMiddlware, requirePermission("calendar:read"), getCalendarEvents);

/**
 * @swagger
 * /api/calendar:
 *   post:
 *     summary: Crée un rendez-vous ponctuel (sans lien à une autre entité)
 *     tags: [Calendar]
 *     responses:
 *       201:
 *         description: Événement créé avec succès
 *       400:
 *         description: title ou startAt manquant
 */
calendarRouter.post(
  "/",
  authMiddlware,
  requirePermission("calendar:manage"),
  createCalendarEvent
);

/**
 * @swagger
 * /api/calendar/{id}:
 *   delete:
 *     summary: Supprime un rendez-vous ponctuel
 *     tags: [Calendar]
 *     responses:
 *       200:
 *         description: Événement supprimé
 *       404:
 *         description: Événement non trouvé
 */
calendarRouter.delete(
  "/:id",
  authMiddlware,
  requirePermission("calendar:manage"),
  deleteCalendarEvent
);

export default calendarRouter;
