import { Router } from "express";
import {
  getMyNotifications,
  markAsRead,
  registerPushToken,
} from "../controllers/notification.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";

const notificationRouter = Router();

/**
 * @swagger
 * /api/notifications/me:
 *   get:
 *     summary: Liste les notifications de l'utilisateur connecté
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
notificationRouter.get("/me", authMiddlware, getMyNotifications);

/**
 * @swagger
 * /api/notifications/{id}/lue:
 *   patch:
 *     summary: Marque une notification comme lue
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notification marquée lue
 *       404:
 *         description: Notification non trouvée
 */
notificationRouter.patch("/:id/lue", authMiddlware, markAsRead);

/**
 * @swagger
 * /api/notifications/push-token:
 *   post:
 *     summary: Enregistre le token Expo Push de l'appareil (MOBILE-G05)
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expoPushToken
 *             properties:
 *               expoPushToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token push enregistré
 */
notificationRouter.post("/push-token", authMiddlware, registerPushToken);

export default notificationRouter;
