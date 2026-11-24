import { Router } from "express";
import { getDashboardCharts, getDashboardOverview, getDashboardStats } from "../controllers/dashboard.controller.js";
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
 *     summary: Répartitions et tendances (biens par type/statut, pipeline client, trésorerie et commissions par mois, performance commissionnaires) - même gating RBAC que /stats
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Données de graphiques récupérées avec succès
 */
dashboardRouter.get("/charts", authMiddlware, getDashboardCharts);

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Bloc Aperçu - demandes reçues et traitées, collectes par type, commissionnaires actifs et inactifs
 *     description: >
 *       Calculé côté serveur ; bornes de période à l'heure de Bukavu
 *       (Africa/Lubumbashi, UTC+2). Une demande est « traitée » quand son
 *       client a dépassé l'étape Nouveau du pipeline. Chaque bloc suit la
 *       permission de lecture de son domaine.
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [day, week, month, year], default: day }
 *     responses:
 *       200: { description: "{ period, start, end, demandes?, collectes, commissionnaires? }" }
 */
dashboardRouter.get("/overview", authMiddlware, getDashboardOverview);

export default dashboardRouter;
