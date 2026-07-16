import { Router } from "express";
import {
  createTask,
  deleteTask,
  getAllTasks,
  getSingleTask,
  updateTask,
  updateTaskStatus,
} from "../controllers/task.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const taskRouter = Router();

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Liste les tâches (filtres statut, assignedToMe)
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
taskRouter.get("/", authMiddlware, requirePermission("tasks:read"), getAllTasks);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Détail d'une tâche (assignés, ressources liées)
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: Tâche trouvée
 *       404:
 *         description: Tâche non trouvée
 */
taskRouter.get("/:id", authMiddlware, requirePermission("tasks:read"), getSingleTask);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Crée une tâche (Kanban), avec assignés et ressources liées optionnels
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priorite:
 *                 type: string
 *                 enum: [BASSE, NORMALE, HAUTE, URGENTE]
 *               dateEcheance:
 *                 type: string
 *                 format: date
 *               assigneeUserIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               idProperties:
 *                 type: array
 *                 items:
 *                   type: integer
 *               idClients:
 *                 type: array
 *                 items:
 *                   type: integer
 *               idBailleurs:
 *                 type: array
 *                 items:
 *                   type: integer
 *               idCommissionnaires:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Tâche créée avec succès
 *       400:
 *         description: title manquant
 */
taskRouter.post("/", authMiddlware, requirePermission("tasks:manage"), createTask);

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     summary: Met à jour une tâche (titre, description, priorité, échéance, assignés, liens)
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: Tâche mise à jour
 *       404:
 *         description: Tâche non trouvée
 */
taskRouter.patch("/:id", authMiddlware, requirePermission("tasks:manage"), updateTask);

/**
 * @swagger
 * /api/tasks/{id}/statut:
 *   patch:
 *     summary: Change le statut d'une tâche (déplacement Kanban) — ne touche jamais une ressource liée
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - statut
 *             properties:
 *               statut:
 *                 type: string
 *                 enum: [A_FAIRE, EN_COURS, EN_REVISION, TERMINEE]
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *       400:
 *         description: Statut invalide
 */
taskRouter.patch(
  "/:id/statut",
  authMiddlware,
  requirePermission("tasks:manage"),
  updateTaskStatus
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Supprime une tâche
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: Tâche supprimée
 *       404:
 *         description: Tâche non trouvée
 */
taskRouter.delete("/:id", authMiddlware, requirePermission("tasks:manage"), deleteTask);

export default taskRouter;
