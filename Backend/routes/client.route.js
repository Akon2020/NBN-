import { Router } from "express";
import {
  createClient,
  deleteClient,
  getAllClients,
  getSingleClient,
  updateClient,
} from "../controllers/client.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const clientRouter = Router();

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Liste tous les clients
 *     tags: [Clients]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
clientRouter.get("/", authMiddlware, requirePermission("clients:read"), getAllClients);

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Récupère un client par son ID
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Client trouvé
 *       404:
 *         description: Client non trouvé
 */
clientRouter.get("/:id", authMiddlware, requirePermission("clients:read"), getSingleClient);

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Crée un nouveau client (segmentation, pipeline, CDC §3 module 3)
 *     tags: [Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               idPerson:
 *                 type: integer
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [LOCATAIRE, ACHETEUR]
 *     responses:
 *       201:
 *         description: Client créé avec succès
 *       400:
 *         description: Données invalides
 */
clientRouter.post("/", authMiddlware, requirePermission("clients:manage"), createClient);

/**
 * @swagger
 * /api/clients/{id}:
 *   patch:
 *     summary: Met à jour un client (pipeline, relances, scoring, ...)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Client mis à jour
 *       404:
 *         description: Client non trouvé
 */
clientRouter.patch(
  "/:id",
  authMiddlware,
  requirePermission("clients:manage"),
  updateClient
);

/**
 * @swagger
 * /api/clients/{id}:
 *   delete:
 *     summary: Supprime un client
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Client supprimé avec succès
 *       404:
 *         description: Client non trouvé
 */
clientRouter.delete(
  "/:id",
  authMiddlware,
  requirePermission("clients:manage"),
  deleteClient
);

export default clientRouter;
