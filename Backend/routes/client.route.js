import { Router } from "express";
import {
  archiveClient,
  createClient,
  createComplaint,
  deleteClient,
  getAllClients,
  getClientComplaints,
  getClientDossier,
  getSingleClient,
  resolveComplaint,
  restoreClient,
  unarchiveClient,
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

/**
 * @swagger
 * /api/clients/{id}/restore:
 *   post:
 *     summary: Restaure un client supprimé (soft delete, BACK-G21)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Client restauré
 *       400:
 *         description: Ce client n'est pas supprimé
 *       404:
 *         description: Client non trouvé
 */
clientRouter.post(
  "/:id/restore",
  authMiddlware,
  requirePermission("clients:manage"),
  restoreClient
);

/**
 * @swagger
 * /api/clients/{id}/archive:
 *   post:
 *     summary: Archive un client (archivage métier, BACK-G21) — distinct de la suppression
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client archivé
 *       400:
 *         description: Motif manquant ou déjà archivé
 *       404:
 *         description: Client non trouvé
 */
clientRouter.post(
  "/:id/archive",
  authMiddlware,
  requirePermission("clients:manage"),
  archiveClient
);

/**
 * @swagger
 * /api/clients/{id}/unarchive:
 *   post:
 *     summary: Désarchive un client (BACK-G21)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Client désarchivé
 *       400:
 *         description: N'est pas archivé
 *       404:
 *         description: Client non trouvé
 */
clientRouter.post(
  "/:id/unarchive",
  authMiddlware,
  requirePermission("clients:manage"),
  unarchiveClient
);

/**
 * @swagger
 * /api/clients/{id}/dossier:
 *   get:
 *     summary: Vue 360 du client — biens matchés/occupés, propositions, commissions/paiements, plaintes (GOAL 8)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dossier agrégé récupéré avec succès
 *       404:
 *         description: Client non trouvé
 */
clientRouter.get(
  "/:id/dossier",
  authMiddlware,
  requirePermission("clients:read"),
  getClientDossier
);

/**
 * @swagger
 * /api/clients/{id}/complaints:
 *   get:
 *     summary: Liste les plaintes d'un client (GOAL 8)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
clientRouter.get(
  "/:id/complaints",
  authMiddlware,
  requirePermission("clients:read"),
  getClientComplaints
);

/**
 * @swagger
 * /api/clients/{id}/complaints:
 *   post:
 *     summary: Enregistre une plainte pour un client (GOAL 8)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject]
 *             properties:
 *               subject:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Plainte enregistrée avec succès
 *       400:
 *         description: subject manquant
 *       404:
 *         description: Client non trouvé
 */
clientRouter.post(
  "/:id/complaints",
  authMiddlware,
  requirePermission("clients:manage"),
  createComplaint
);

/**
 * @swagger
 * /api/clients/{id}/complaints/{complaintId}/resolve:
 *   patch:
 *     summary: Résout une plainte client (GOAL 8)
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: complaintId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Plainte résolue avec succès
 *       400:
 *         description: Plainte déjà résolue
 *       404:
 *         description: Plainte non trouvée
 */
clientRouter.patch(
  "/:id/complaints/:complaintId/resolve",
  authMiddlware,
  requirePermission("clients:manage"),
  resolveComplaint
);

export default clientRouter;
