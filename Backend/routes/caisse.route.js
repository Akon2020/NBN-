import { Router } from "express";
import {
  createCaisse,
  getAllCaisses,
  getSingleCaisse,
  updateCaisse,
} from "../controllers/caisse.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const caisseRouter = Router();

/**
 * @swagger
 * /api/caisses:
 *   get:
 *     summary: Liste toutes les caisses avec leurs soldes par devise
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
caisseRouter.get("/", authMiddlware, requirePermission("treasury:read"), getAllCaisses);

/**
 * @swagger
 * /api/caisses/{id}:
 *   get:
 *     summary: Détail d'une caisse (soldes, responsable)
 *     tags: [Treasury]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Caisse trouvée
 *       404:
 *         description: Caisse non trouvée
 */
caisseRouter.get("/:id", authMiddlware, requirePermission("treasury:read"), getSingleCaisse);

/**
 * @swagger
 * /api/caisses:
 *   post:
 *     summary: Crée une caisse (un solde à zéro est initialisé pour chaque devise active)
 *     tags: [Treasury]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - label
 *             properties:
 *               label:
 *                 type: string
 *               responsableUserId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Caisse créée avec succès
 */
caisseRouter.post("/", authMiddlware, requirePermission("treasury:manage"), createCaisse);

/**
 * @swagger
 * /api/caisses/{id}:
 *   patch:
 *     summary: Met à jour une caisse (label, responsable, statut ouverte/clôturée)
 *     tags: [Treasury]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Caisse mise à jour
 *       404:
 *         description: Caisse non trouvée
 */
caisseRouter.patch("/:id", authMiddlware, requirePermission("treasury:manage"), updateCaisse);

export default caisseRouter;
