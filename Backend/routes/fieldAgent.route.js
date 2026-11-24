import { Router } from "express";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import {
  declareFieldAgentConclusion,
  getFieldAgentClients,
  getFieldAgentCommissions,
  getFieldAgentOverview,
  getFieldAgentProperties,
  getFieldAgentTasks,
  requireFieldAgent,
  updateFieldAgentTaskStatus,
} from "../controllers/fieldAgent.controller.js";

const fieldAgentRouter = Router();

// Règle contextuelle et non permission RBAC : le compte doit être lié à une
// fiche commissionnaire ou collecteur, et ne voit que ce qui la concerne.
fieldAgentRouter.use(authMiddlware, requireFieldAgent);

/**
 * @swagger
 * /api/field-agent/me:
 *   get:
 *     summary: Espace commissionnaire / collecteur - fiche (sans notation) et tableau de bord
 *     description: >
 *       stats.biensEnregistres (biens portant son code), clientsTraites (pipeline
 *       conclu ou perdu), clientsEnCours, tachesOuvertes, commissions par statut
 *       et par devise (enAttente = calculée, pretes = due, payees = payée).
 *     tags: [Espace commissionnaire]
 *     responses:
 *       200: { description: Fiche et indicateurs }
 *       404: { description: Aucune fiche liée au compte }
 */
fieldAgentRouter.get("/me", getFieldAgentOverview);

/**
 * @swagger
 * /api/field-agent/properties:
 *   get:
 *     summary: Biens enregistrés avec son code (sans bailleur, prix minimum ni marge)
 *     tags: [Espace commissionnaire]
 * /api/field-agent/clients:
 *   get:
 *     summary: Clients qu'il a apportés (numéro, nom, étape du pipeline)
 *     tags: [Espace commissionnaire]
 * /api/field-agent/tasks:
 *   get:
 *     summary: Tâches qui lui sont assignées ou liées à sa fiche
 *     tags: [Espace commissionnaire]
 * /api/field-agent/commissions:
 *   get:
 *     summary: Ses commissions (en attente, prête, payée)
 *     tags: [Espace commissionnaire]
 */
fieldAgentRouter.get("/properties", getFieldAgentProperties);
fieldAgentRouter.get("/clients", getFieldAgentClients);
fieldAgentRouter.get("/tasks", getFieldAgentTasks);
fieldAgentRouter.get("/commissions", getFieldAgentCommissions);

/**
 * @swagger
 * /api/field-agent/tasks/{id}/statut:
 *   patch:
 *     summary: Change le statut d'une de ses tâches (A_FAIRE, EN_COURS, TERMINEE)
 *     tags: [Espace commissionnaire]
 *     responses:
 *       200: { description: Statut modifié }
 *       404: { description: Tâche qui ne le concerne pas }
 * /api/field-agent/tasks/{id}/conclusion:
 *   post:
 *     summary: Déclare une tâche conclue (ex. client conclu) - passe en révision, l'agence valide
 *     tags: [Espace commissionnaire]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { note: { type: string } } }
 */
fieldAgentRouter.patch("/tasks/:id/statut", updateFieldAgentTaskStatus);
fieldAgentRouter.post("/tasks/:id/conclusion", declareFieldAgentConclusion);

export default fieldAgentRouter;
