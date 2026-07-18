import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";

const dashboardRouter = Router();

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Statistiques agrégées du tableau de bord (chaque bloc respecte la permission de lecture du domaine correspondant)
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 */
dashboardRouter.get("/stats", authMiddlware, getDashboardStats);

export default dashboardRouter;
