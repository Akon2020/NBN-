import { Router } from "express";
import { getDashboardCharts, getDashboardStats } from "../controllers/dashboard.controller.js";
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

/**
 * @swagger
 * /api/dashboard/charts:
 *   get:
 *     summary: Répartitions et tendances (biens par type/statut, pipeline client, trésorerie et commissions par mois, performance commissionnaires) — même gating RBAC que /stats
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Données de graphiques récupérées avec succès
 */
dashboardRouter.get("/charts", authMiddlware, getDashboardCharts);

export default dashboardRouter;
