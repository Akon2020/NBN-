import { Router } from "express";
import {
  createExchangeRate,
  getAllExchangeRates,
} from "../controllers/exchangeRate.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const exchangeRateRouter = Router();

/**
 * @swagger
 * /api/exchange-rates:
 *   get:
 *     summary: Liste les taux de change enregistrés (reporting consolidé uniquement)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
exchangeRateRouter.get(
  "/",
  authMiddlware,
  requirePermission("treasury:read"),
  getAllExchangeRates
);

/**
 * @swagger
 * /api/exchange-rates:
 *   post:
 *     summary: Enregistre un taux de change tracé (from, to, rate, date, source)
 *     tags: [Treasury]
 *     responses:
 *       201:
 *         description: Taux de change enregistré
 *       400:
 *         description: Données invalides
 */
exchangeRateRouter.post(
  "/",
  authMiddlware,
  requirePermission("treasury:manage"),
  createExchangeRate
);

export default exchangeRateRouter;
