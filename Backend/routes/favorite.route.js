import { Router } from "express";
import {
  addFavorite,
  getMyFavorites,
  removeFavorite,
} from "../controllers/favorite.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";

const favoriteRouter = Router();

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Liste les favoris de l'utilisateur connecté
 *     tags: [Favorites]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
favoriteRouter.get("/", authMiddlware, getMyFavorites);

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     summary: Ajoute un bien aux favoris
 *     tags: [Favorites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idProperty
 *             properties:
 *               idProperty:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Ajouté aux favoris
 *       404:
 *         description: Propriété non trouvée
 */
favoriteRouter.post("/", authMiddlware, addFavorite);

/**
 * @swagger
 * /api/favorites/{idProperty}:
 *   delete:
 *     summary: Retire un bien des favoris
 *     tags: [Favorites]
 *     parameters:
 *       - in: path
 *         name: idProperty
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Retiré des favoris
 *       404:
 *         description: Favori non trouvé
 */
favoriteRouter.delete("/:idProperty", authMiddlware, removeFavorite);

export default favoriteRouter;
