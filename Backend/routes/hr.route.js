import { Router } from "express";
import {
  addEmployeeSkill,
  addEmployeeTraining,
  createEmployeeProfile,
  createEvaluation,
  createObjective,
  createSkill,
  createTraining,
  getAllEmployeeProfiles,
  getAllSkills,
  getAllTrainings,
  getEvaluationsForEmployee,
  getObjectivesForEmployee,
  getSingleEmployeeProfile,
  removeEmployeeSkill,
  updateEmployeeProfile,
  updateEmployeeTrainingStatus,
  updateObjectiveStatus,
} from "../controllers/hr.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const hrRouter = Router();

/**
 * @swagger
 * /api/hr/employee-profiles:
 *   get:
 *     summary: Liste tous les profils RH
 *     tags: [HR]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
hrRouter.get("/employee-profiles", authMiddlware, requirePermission("hr:read"), getAllEmployeeProfiles);

/**
 * @swagger
 * /api/hr/employee-profiles/{id}:
 *   get:
 *     summary: Récupère un profil RH par son ID
 *     tags: [HR]
 *     responses:
 *       200:
 *         description: Profil trouvé
 *       404:
 *         description: Profil non trouvé
 */
hrRouter.get(
  "/employee-profiles/:id",
  authMiddlware,
  requirePermission("hr:read"),
  getSingleEmployeeProfile
);

/**
 * @swagger
 * /api/hr/employee-profiles:
 *   post:
 *     summary: Crée un profil RH (Person existante via idPerson, ou nouvelle via fullName)
 *     tags: [HR]
 *     responses:
 *       201:
 *         description: Profil créé avec succès
 *       400:
 *         description: Données invalides
 */
hrRouter.post(
  "/employee-profiles",
  authMiddlware,
  requirePermission("hr:manage"),
  createEmployeeProfile
);

/**
 * @swagger
 * /api/hr/employee-profiles/{id}:
 *   patch:
 *     summary: Met à jour un profil RH (service, poste, responsable, contrat, statut)
 *     tags: [HR]
 *     responses:
 *       200:
 *         description: Profil mis à jour
 *       404:
 *         description: Profil non trouvé
 */
hrRouter.patch(
  "/employee-profiles/:id",
  authMiddlware,
  requirePermission("hr:manage"),
  updateEmployeeProfile
);

/**
 * @swagger
 * /api/hr/employee-profiles/{id}/evaluations:
 *   get:
 *     summary: Liste les évaluations d'un profil RH
 *     tags: [HR]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
hrRouter.get(
  "/employee-profiles/:id/evaluations",
  authMiddlware,
  requirePermission("hr:read"),
  getEvaluationsForEmployee
);

/**
 * @swagger
 * /api/hr/employee-profiles/{id}/evaluations:
 *   post:
 *     summary: Crée une évaluation de performance (V1 minimale — note libre + commentaire)
 *     tags: [HR]
 *     responses:
 *       201:
 *         description: Évaluation créée avec succès
 *       400:
 *         description: period manquant
 */
hrRouter.post(
  "/employee-profiles/:id/evaluations",
  authMiddlware,
  requirePermission("hr:manage"),
  createEvaluation
);

/**
 * @swagger
 * /api/hr/employee-profiles/{id}/objectives:
 *   get:
 *     summary: Liste les objectifs d'un profil RH
 *     tags: [HR]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
hrRouter.get(
  "/employee-profiles/:id/objectives",
  authMiddlware,
  requirePermission("hr:read"),
  getObjectivesForEmployee
);

/**
 * @swagger
 * /api/hr/employee-profiles/{id}/objectives:
 *   post:
 *     summary: Crée un objectif individuel
 *     tags: [HR]
 *     responses:
 *       201:
 *         description: Objectif créé avec succès
 *       400:
 *         description: title manquant
 */
hrRouter.post(
  "/employee-profiles/:id/objectives",
  authMiddlware,
  requirePermission("hr:manage"),
  createObjective
);

/**
 * @swagger
 * /api/hr/objectives/{objectiveId}/statut:
 *   patch:
 *     summary: Met à jour le statut d'un objectif (EN_COURS/ATTEINT/NON_ATTEINT)
 *     tags: [HR]
 *     responses:
 *       200:
 *         description: Objectif mis à jour
 *       400:
 *         description: statut invalide
 */
hrRouter.patch(
  "/objectives/:objectiveId/statut",
  authMiddlware,
  requirePermission("hr:manage"),
  updateObjectiveStatus
);

/**
 * @swagger
 * /api/hr/skills:
 *   get:
 *     summary: Liste le catalogue de compétences
 *     tags: [HR]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
hrRouter.get("/skills", authMiddlware, requirePermission("hr:read"), getAllSkills);

/**
 * @swagger
 * /api/hr/skills:
 *   post:
 *     summary: Ajoute une compétence au catalogue
 *     tags: [HR]
 *     responses:
 *       201:
 *         description: Compétence créée avec succès
 */
hrRouter.post("/skills", authMiddlware, requirePermission("hr:manage"), createSkill);

/**
 * @swagger
 * /api/hr/employee-profiles/{id}/skills:
 *   post:
 *     summary: Associe (ou met à jour le niveau d') une compétence à un profil RH
 *     tags: [HR]
 *     responses:
 *       201:
 *         description: Compétence associée avec succès
 */
hrRouter.post(
  "/employee-profiles/:id/skills",
  authMiddlware,
  requirePermission("hr:manage"),
  addEmployeeSkill
);

/**
 * @swagger
 * /api/hr/employee-skills/{employeeSkillId}:
 *   delete:
 *     summary: Retire une compétence d'un profil RH
 *     tags: [HR]
 *     responses:
 *       200:
 *         description: Compétence retirée avec succès
 *       404:
 *         description: Association non trouvée
 */
hrRouter.delete(
  "/employee-skills/:employeeSkillId",
  authMiddlware,
  requirePermission("hr:manage"),
  removeEmployeeSkill
);

/**
 * @swagger
 * /api/hr/trainings:
 *   get:
 *     summary: Liste le catalogue de formations
 *     tags: [HR]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
hrRouter.get("/trainings", authMiddlware, requirePermission("hr:read"), getAllTrainings);

/**
 * @swagger
 * /api/hr/trainings:
 *   post:
 *     summary: Ajoute une formation au catalogue
 *     tags: [HR]
 *     responses:
 *       201:
 *         description: Formation créée avec succès
 */
hrRouter.post("/trainings", authMiddlware, requirePermission("hr:manage"), createTraining);

/**
 * @swagger
 * /api/hr/employee-profiles/{id}/trainings:
 *   post:
 *     summary: Assigne une formation à un profil RH
 *     tags: [HR]
 *     responses:
 *       201:
 *         description: Formation assignée avec succès
 */
hrRouter.post(
  "/employee-profiles/:id/trainings",
  authMiddlware,
  requirePermission("hr:manage"),
  addEmployeeTraining
);

/**
 * @swagger
 * /api/hr/employee-trainings/{employeeTrainingId}/statut:
 *   patch:
 *     summary: Met à jour le statut d'une formation assignée
 *     tags: [HR]
 *     responses:
 *       200:
 *         description: Formation mise à jour
 *       400:
 *         description: statut invalide
 */
hrRouter.patch(
  "/employee-trainings/:employeeTrainingId/statut",
  authMiddlware,
  requirePermission("hr:manage"),
  updateEmployeeTrainingStatus
);

export default hrRouter;
