import { Router } from "express";
import {
  addPropertyImages,
  createProperty,
  deleteProperty,
  getAllProperties,
  getPropertiesByStatut,
  getSingleProperty,
  updateProperty,
} from "../controllers/property.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";
import upload from "../middlewares/upload.middleware.js";
import { normalizeUploadPaths } from "../utils/normalizeUploadPaths.js";

const propertyRouter = Router();

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Liste tous les biens immobiliers
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
propertyRouter.get("/", authMiddlware, getAllProperties);

/**
 * @swagger
 * /api/properties/statut/{statut}:
 *   get:
 *     summary: Liste les biens par statut (DISPONIBLE, RESERVE, LOUE_VENDU)
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: statut
 *         required: true
 *         schema:
 *           type: string
 *           enum: [DISPONIBLE, RESERVE, LOUE_VENDU]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
propertyRouter.get("/statut/:statut", authMiddlware, getPropertiesByStatut);

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Récupère un bien par son ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bien trouvé
 *       404:
 *         description: Bien non trouvé
 */
propertyRouter.get("/:id", authMiddlware, getSingleProperty);

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Crée un nouveau bien immobilier
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - propertyType
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [RENT, SALE]
 *               propertyType:
 *                 type: string
 *     responses:
 *       201:
 *         description: Propriété créée avec succès
 *       400:
 *         description: Données invalides
 */
propertyRouter.post(
  "/",
  authMiddlware,
  requirePermission("property:manage"),
  createProperty
);

/**
 * @swagger
 * /api/properties/{id}:
 *   patch:
 *     summary: Met à jour un bien immobilier
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Propriété mise à jour
 *       404:
 *         description: Propriété non trouvée
 */
propertyRouter.patch(
  "/:id",
  authMiddlware,
  requirePermission("property:manage"),
  updateProperty
);

/**
 * @swagger
 * /api/properties/{id}/images:
 *   post:
 *     summary: Ajoute des images à un bien (upload découplé de la création)
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Images ajoutées avec succès
 */
propertyRouter.post(
  "/:id/images",
  authMiddlware,
  requirePermission("property:manage"),
  upload.array("image", 10),
  normalizeUploadPaths,
  addPropertyImages
);

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Supprime un bien immobilier
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Propriété supprimée avec succès
 *       404:
 *         description: Propriété non trouvée
 */
propertyRouter.delete(
  "/:id",
  authMiddlware,
  requirePermission("property:manage"),
  deleteProperty
);

export default propertyRouter;
