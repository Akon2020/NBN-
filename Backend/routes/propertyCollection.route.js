import { Router } from "express";
import { createPropertyCollection } from "../controllers/propertyCollection.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { publicFormLimiter } from "../middlewares/rateLimit.middleware.js";

const propertyCollectionRouter = Router();

/**
 * @swagger
 * /api/property-collections:
 *   post:
 *     summary: Enregistre un bien collecté sur le terrain — crée le bien, son bailleur et une mission de traçabilité
 *     description: >
 *       Route interne non indexée côté client, atteignable sans compte (un
 *       commissionnaire terrain n'en a pas toujours). L'utilisateur connecté
 *       est tracé s'il y en a un ; sinon la collecte reste rattachable via le
 *       nom du collecteur et son code commissionnaire.
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [typeMission, typeOperation, propertyType, commune, prix, proprietaireNom, proprietairePhone, collecteurNom]
 *             properties:
 *               typeMission:
 *                 type: string
 *                 enum: [COLLECTE_BIEN, APPORT_CLIENT, SUIVI, MISE_A_JOUR]
 *               typeOperation:
 *                 type: string
 *                 enum: [RENT, SALE]
 *               propertyType:
 *                 type: string
 *               commune:
 *                 type: string
 *                 enum: [IBANDA, KADUTU, BAGIRA]
 *               prix:
 *                 type: string
 *               proprietaireNom:
 *                 type: string
 *               proprietairePhone:
 *                 type: string
 *               collecteurNom:
 *                 type: string
 *               codeCommissionnaire:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bien enregistré avec succès
 *       400:
 *         description: Champs requis manquants
 *       429:
 *         description: Trop de soumissions depuis cet appareil
 */
propertyCollectionRouter.post("/", publicFormLimiter, optionalAuth, createPropertyCollection);

export default propertyCollectionRouter;
