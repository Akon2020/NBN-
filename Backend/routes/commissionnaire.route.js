import { Router } from "express";
import {
  createCommissionnaire,
  createIncident,
  deleteCommissionnaire,
  getAllCommissionnaires,
  getCommissionnaireClients,
  getMyCommissionnaireProfile,
  getSingleCommissionnaire,
  updateCommissionnaire,
  updateCommissionnaireScore,
} from "../controllers/commissionnaire.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const commissionnaireRouter = Router();

/**
 * @swagger
 * /api/commissionnaires/me:
 *   get:
 *     summary: Récupère la fiche commissionnaire du compte connecté (MOBILE-G04)
 *     tags: [Commissionnaires]
 *     responses:
 *       200:
 *         description: Fiche trouvée
 *       404:
 *         description: Aucune fiche commissionnaire liée à ce compte
 */
commissionnaireRouter.get(
  "/me",
  authMiddlware,
  requirePermission("commissionnaires:read"),
  getMyCommissionnaireProfile
);

/**
 * @swagger
 * /api/commissionnaires:
 *   get:
 *     summary: Liste tous les commissionnaires (fiche digitale, CDC §7)
 *     tags: [Commissionnaires]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
commissionnaireRouter.get(
  "/",
  authMiddlware,
  requirePermission("commissionnaires:read"),
  getAllCommissionnaires
);

/**
 * @swagger
 * /api/commissionnaires/{id}:
 *   get:
 *     summary: Récupère un commissionnaire par son ID (avec incidents)
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Commissionnaire trouvé
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.get(
  "/:id",
  authMiddlware,
  requirePermission("commissionnaires:read"),
  getSingleCommissionnaire
);

/**
 * @swagger
 * /api/commissionnaires/{id}/clients:
 *   get:
 *     summary: Liste les clients apportés par ce commissionnaire (GOAL 4 — Client.sourceCommissionnaireCode)
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.get(
  "/:id/clients",
  authMiddlware,
  requirePermission("clients:read"),
  getCommissionnaireClients
);

/**
 * @swagger
 * /api/commissionnaires:
 *   post:
 *     summary: Crée un nouveau commissionnaire
 *     tags: [Commissionnaires]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               idPerson:
 *                 type: integer
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               zone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Commissionnaire créé avec succès
 *       400:
 *         description: Données invalides
 *       409:
 *         description: Code déjà utilisé
 */
commissionnaireRouter.post(
  "/",
  authMiddlware,
  requirePermission("commissionnaires:manage"),
  createCommissionnaire
);

/**
 * @swagger
 * /api/commissionnaires/{id}:
 *   patch:
 *     summary: Met à jour un commissionnaire (zone, statut Actif/Observation/Suspendu/Exclu)
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Commissionnaire mis à jour
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.patch(
  "/:id",
  authMiddlware,
  requirePermission("commissionnaires:manage"),
  updateCommissionnaire
);

/**
 * @swagger
 * /api/commissionnaires/{id}/score:
 *   patch:
 *     summary: Évalue les 4 sous-scores d'un commissionnaire (performance/qualité/discipline/engagement, /25 chacun)
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Score mis à jour, grille d'évolution réappliquée
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.patch(
  "/:id/score",
  authMiddlware,
  requirePermission("commissionnaires:manage"),
  updateCommissionnaireScore
);

/**
 * @swagger
 * /api/commissionnaires/{id}/incidents:
 *   post:
 *     summary: Enregistre un incident (retard, données incomplètes, non-respect des règles)
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Incident enregistré, score discipline réévalué
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.post(
  "/:id/incidents",
  authMiddlware,
  requirePermission("commissionnaires:manage"),
  createIncident
);

/**
 * @swagger
 * /api/commissionnaires/{id}:
 *   delete:
 *     summary: Supprime un commissionnaire
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Commissionnaire supprimé avec succès
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.delete(
  "/:id",
  authMiddlware,
  requirePermission("commissionnaires:manage"),
  deleteCommissionnaire
);

export default commissionnaireRouter;
