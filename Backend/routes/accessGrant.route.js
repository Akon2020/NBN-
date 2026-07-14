import { Router } from "express";
import {
  createAccessGrant,
  getAllAccessGrants,
  revokeAccessGrant,
} from "../controllers/accessGrant.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const accessGrantRouter = Router();

/**
 * @swagger
 * /api/access-grants:
 *   get:
 *     summary: Liste tous les AccessGrant
 *     tags: [AccessGrants]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
accessGrantRouter.get(
  "/",
  authMiddlware,
  requirePermission("roles:manage"),
  getAllAccessGrants
);

/**
 * @swagger
 * /api/access-grants:
 *   post:
 *     summary: Accorde une permission unitaire à un utilisateur (mécanisme consultant)
 *     tags: [AccessGrants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idUser
 *               - permissionKey
 *               - reason
 *             properties:
 *               idUser:
 *                 type: integer
 *               permissionKey:
 *                 type: string
 *               reason:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Accès accordé avec succès
 *       400:
 *         description: Données invalides
 */
accessGrantRouter.post(
  "/",
  authMiddlware,
  requirePermission("roles:manage"),
  createAccessGrant
);

/**
 * @swagger
 * /api/access-grants/{id}/revoke:
 *   patch:
 *     summary: Révoque un AccessGrant
 *     tags: [AccessGrants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Accès révoqué avec succès
 *       404:
 *         description: Accès non trouvé
 */
accessGrantRouter.patch(
  "/:id/revoke",
  authMiddlware,
  requirePermission("roles:manage"),
  revokeAccessGrant
);

export default accessGrantRouter;
