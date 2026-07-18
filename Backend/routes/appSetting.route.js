import { Router } from "express";
import { getAllSettings, updateSetting } from "../controllers/appSetting.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const appSettingRouter = Router();

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Liste les paramètres de configuration (GOAL 13)
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
appSettingRouter.get("/", authMiddlware, requirePermission("settings:read"), getAllSettings);

/**
 * @swagger
 * /api/settings/{key}:
 *   patch:
 *     summary: Modifie un paramètre de configuration existant (GOAL 13) — jamais de clé créée à la volée
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value: {}
 *     responses:
 *       200:
 *         description: Paramètre mis à jour
 *       404:
 *         description: Paramètre non trouvé
 */
appSettingRouter.patch(
  "/:key",
  authMiddlware,
  requirePermission("settings:manage"),
  updateSetting
);

export default appSettingRouter;
