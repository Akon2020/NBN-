import { Router } from "express";
import {
  createCurrency,
  getAllCurrencies,
  updateCurrency,
} from "../controllers/currency.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const currencyRouter = Router();

/**
 * @swagger
 * /api/currencies:
 *   get:
 *     summary: Liste les devises (actives par défaut, ?includeInactive=true pour tout voir)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
currencyRouter.get("/", authMiddlware, requirePermission("treasury:read"), getAllCurrencies);

/**
 * @swagger
 * /api/currencies:
 *   post:
 *     summary: Ajoute une devise au catalogue (USD/CDF pré-remplies, extensible sans migration)
 *     tags: [Treasury]
 *     responses:
 *       201:
 *         description: Devise créée avec succès
 *       409:
 *         description: Cette devise existe déjà
 */
currencyRouter.post("/", authMiddlware, requirePermission("treasury:manage"), createCurrency);

/**
 * @swagger
 * /api/currencies/{code}:
 *   patch:
 *     summary: Met à jour une devise (label, symbole, activation) — jamais de suppression
 *     tags: [Treasury]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Devise mise à jour
 *       404:
 *         description: Devise non trouvée
 */
currencyRouter.patch(
  "/:code",
  authMiddlware,
  requirePermission("treasury:manage"),
  updateCurrency
);

export default currencyRouter;
