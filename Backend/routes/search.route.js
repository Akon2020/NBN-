import { Router } from "express";
import { globalSearch } from "../controllers/search.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";

const searchRouter = Router();

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Recherche transverse (biens, clients, bailleurs, commissionnaires, tâches) — chaque type filtré par la permission de lecture de l'appelant
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Terme de recherche (2 caractères minimum)
 *     responses:
 *       200:
 *         description: Résultats groupés par type d'entité
 *       400:
 *         description: q manquant ou trop court
 */
searchRouter.get("/", authMiddlware, globalSearch);

export default searchRouter;
