import { Router } from "express";
import {
  createBailleur,
  deleteBailleur,
  getAllBailleurs,
  getBailleurIdentityDocument,
  getSingleBailleur,
  updateBailleur,
} from "../controllers/bailleur.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const bailleurRouter = Router();

/**
 * @swagger
 * /api/bailleurs:
 *   get:
 *     summary: Liste tous les bailleurs
 *     tags: [Bailleurs]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
bailleurRouter.get("/", authMiddlware, requirePermission("bailleurs:read"), getAllBailleurs);

/**
 * @swagger
 * /api/bailleurs/{id}:
 *   get:
 *     summary: Récupère un bailleur par son ID
 *     tags: [Bailleurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bailleur trouvé
 *       404:
 *         description: Bailleur non trouvé
 */
bailleurRouter.get(
  "/:id",
  authMiddlware,
  requirePermission("bailleurs:read"),
  getSingleBailleur
);

/**
 * @swagger
 * /api/bailleurs:
 *   post:
 *     summary: Crée un nouveau bailleur (CDC §3 module 3 "FICHE BAILLEUR")
 *     tags: [Bailleurs]
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
 *                 enum: [PROPRIETAIRE, MANDATAIRE]
 *     responses:
 *       201:
 *         description: Bailleur créé avec succès
 *       400:
 *         description: Données invalides
 */
bailleurRouter.post(
  "/",
  authMiddlware,
  requirePermission("bailleurs:manage"),
  createBailleur
);

/**
 * @swagger
 * /api/bailleurs/{id}:
 *   patch:
 *     summary: Met à jour un bailleur
 *     tags: [Bailleurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bailleur mis à jour
 *       404:
 *         description: Bailleur non trouvé
 */
bailleurRouter.patch(
  "/:id",
  authMiddlware,
  requirePermission("bailleurs:manage"),
  updateBailleur
);

/**
 * @swagger
 * /api/bailleurs/{id}:
 *   delete:
 *     summary: Supprime un bailleur
 *     tags: [Bailleurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bailleur supprimé avec succès
 *       404:
 *         description: Bailleur non trouvé
 */
bailleurRouter.delete(
  "/:id",
  authMiddlware,
  requirePermission("bailleurs:manage"),
  deleteBailleur
);

/**
 * @swagger
 * /api/bailleurs/{id}/piece-identite:
 *   get:
 *     summary: Pièce d'identité annexée au bailleur (image JPEG ou PDF)
 *     description: >
 *       Fichier stocké hors du dossier public. Réservé à
 *       `bailleurs:identity:read` (admin par défaut). La fiche du bailleur
 *       n'expose que `person.hasIdDocument`, jamais le chemin du fichier.
 *     tags: [Bailleurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Le fichier (Cache-Control private, no-store)
 *       403:
 *         description: Permission bailleurs:identity:read manquante
 *       404:
 *         description: Aucune pièce d'identité pour ce bailleur
 */
bailleurRouter.get(
  "/:id/piece-identite",
  authMiddlware,
  requirePermission("bailleurs:identity:read"),
  getBailleurIdentityDocument
);

export default bailleurRouter;
