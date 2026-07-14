import { Router } from "express";
import { getAllPermissions } from "../controllers/permission.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const permissionRouter = Router();

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Liste le catalogue de permissions disponibles
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
permissionRouter.get(
  "/",
  authMiddlware,
  requirePermission("roles:manage"),
  getAllPermissions
);

export default permissionRouter;
