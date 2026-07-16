import { Router } from "express";
import {
  archiveMission,
  createMission,
  getAllMissions,
  getMissionsByCommissionnaire,
  rejectMission,
  requestMissionCorrection,
  unarchiveMission,
  validateMission,
} from "../controllers/mission.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const missionRouter = Router();

/**
 * @swagger
 * /api/missions:
 *   get:
 *     summary: Liste toutes les missions terrain
 *     tags: [Missions]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
missionRouter.get("/", authMiddlware, requirePermission("missions:read"), getAllMissions);

/**
 * @swagger
 * /api/missions/commissionnaire/{idCommissionnaire}:
 *   get:
 *     summary: Liste les missions d'un commissionnaire donné
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: idCommissionnaire
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
missionRouter.get(
  "/commissionnaire/:idCommissionnaire",
  authMiddlware,
  requirePermission("missions:read"),
  getMissionsByCommissionnaire
);

/**
 * @swagger
 * /api/missions:
 *   post:
 *     summary: Soumet une mission terrain (collecte de bien, apport client, suivi) — idempotent sur uuid
 *     tags: [Missions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uuid
 *               - idCommissionnaire
 *               - type
 *             properties:
 *               uuid:
 *                 type: string
 *               idCommissionnaire:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [COLLECTE_BIEN, APPORT_CLIENT, SUIVI]
 *               idProperty:
 *                 type: integer
 *               idClient:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Mission soumise avec succès
 *       200:
 *         description: Mission déjà soumise (idempotence)
 *       400:
 *         description: Données invalides
 */
missionRouter.post("/", authMiddlware, requirePermission("missions:create"), createMission);

/**
 * @swagger
 * /api/missions/{id}/valider:
 *   patch:
 *     summary: Valide une mission terrain
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mission validée
 *       404:
 *         description: Mission non trouvée
 */
missionRouter.patch(
  "/:id/valider",
  authMiddlware,
  requirePermission("missions:validate"),
  validateMission
);

/**
 * @swagger
 * /api/missions/{id}/rejeter:
 *   patch:
 *     summary: Rejette une mission terrain (motif obligatoire)
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mission rejetée
 *       400:
 *         description: Motif manquant
 *       404:
 *         description: Mission non trouvée
 */
missionRouter.patch(
  "/:id/rejeter",
  authMiddlware,
  requirePermission("missions:validate"),
  rejectMission
);

/**
 * @swagger
 * /api/missions/{id}/demander-correction:
 *   patch:
 *     summary: Demande une correction sur une mission terrain (motif obligatoire)
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Correction demandée
 *       400:
 *         description: Motif manquant
 *       404:
 *         description: Mission non trouvée
 */
missionRouter.patch(
  "/:id/demander-correction",
  authMiddlware,
  requirePermission("missions:validate"),
  requestMissionCorrection
);

/**
 * @swagger
 * /api/missions/{id}/archive:
 *   post:
 *     summary: Archive une mission terrain (archivage métier, BACK-G21) — reste consultable
 *     tags: [Missions]
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
 *         description: Mission archivée
 *       400:
 *         description: Motif manquant ou déjà archivée
 *       404:
 *         description: Mission non trouvée
 */
missionRouter.post(
  "/:id/archive",
  authMiddlware,
  requirePermission("missions:validate"),
  archiveMission
);

/**
 * @swagger
 * /api/missions/{id}/unarchive:
 *   post:
 *     summary: Désarchive une mission terrain (BACK-G21)
 *     tags: [Missions]
 *     responses:
 *       200:
 *         description: Mission désarchivée
 *       400:
 *         description: N'est pas archivée
 *       404:
 *         description: Mission non trouvée
 */
missionRouter.post(
  "/:id/unarchive",
  authMiddlware,
  requirePermission("missions:validate"),
  unarchiveMission
);

export default missionRouter;
