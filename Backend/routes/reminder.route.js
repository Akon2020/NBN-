import { Router } from "express";
import {
  cancelReminder,
  createReminder,
  getMyReminders,
} from "../controllers/reminder.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";

const reminderRouter = Router();

/**
 * @swagger
 * /api/reminders/me:
 *   get:
 *     summary: Liste les rappels de l'utilisateur connecté (filtre statut)
 *     tags: [Reminders]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
reminderRouter.get("/me", authMiddlware, getMyReminders);

/**
 * @swagger
 * /api/reminders:
 *   post:
 *     summary: Programme un rappel à une échéance donnée
 *     tags: [Reminders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - dueAt
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               dueAt:
 *                 type: string
 *                 format: date-time
 *               idUser:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Rappel programmé avec succès
 *       400:
 *         description: title ou dueAt manquant
 */
reminderRouter.post("/", authMiddlware, createReminder);

/**
 * @swagger
 * /api/reminders/{id}/annuler:
 *   patch:
 *     summary: Annule un rappel planifié
 *     tags: [Reminders]
 *     responses:
 *       200:
 *         description: Rappel annulé
 *       400:
 *         description: Rappel déjà envoyé/annulé
 */
reminderRouter.patch("/:id/annuler", authMiddlware, cancelReminder);

export default reminderRouter;
