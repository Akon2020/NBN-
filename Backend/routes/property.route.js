import { Router } from "express";
import {
  addPropertyImages,
  addPropertyVideos,
  archiveProperty,
  createProperty,
  deleteProperty,
  deletePropertyImage,
  deletePropertyVideo,
  getAllProperties,
  getPropertiesByStatut,
  getPublicProperties,
  getPublicProperty,
  getSingleProperty,
  reorderPropertyImages,
  reorderPropertyVideos,
  restoreProperty,
  unarchiveProperty,
  updateProperty,
  updatePropertyMarginOverride,
  updatePropertyStatut,
} from "../controllers/property.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";
import upload, { uploadVideo } from "../middlewares/upload.middleware.js";
import { normalizeUploadPaths } from "../utils/normalizeUploadPaths.js";

const propertyRouter = Router();

/**
 * @swagger
 * /api/properties/public:
 *   get:
 *     summary: Liste publique des biens DISPONIBLE (sans authentification, MOBILE-G03)
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
propertyRouter.get("/public", getPublicProperties);

/**
 * @swagger
 * /api/properties/public/{id}:
 *   get:
 *     summary: Détail public d'un bien DISPONIBLE (sans authentification, MOBILE-G03)
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
 *         description: Bien non trouvé ou non disponible
 */
propertyRouter.get("/public/:id", getPublicProperty);

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
 *     summary: Liste les biens par statut
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: statut
 *         required: true
 *         schema:
 *           type: string
 *           enum: [DISPONIBLE, OCCUPE_CLIENT_NBN, OCCUPE_CLIENT_EXTERNE, EN_MAINTENANCE, VENDU]
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
 * /api/properties/{id}/statut:
 *   patch:
 *     summary: Change le statut d'un bien (cycle de vie, GOAL 1) — seul point d'entrée pour cette transition, journalisée dans la timeline
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [statut]
 *             properties:
 *               statut:
 *                 type: string
 *                 enum: [DISPONIBLE, OCCUPE_CLIENT_NBN, OCCUPE_CLIENT_EXTERNE, EN_MAINTENANCE, VENDU]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *       400:
 *         description: Statut invalide, déjà appliqué, ou VENDU sur un bien à louer
 *       404:
 *         description: Propriété non trouvée
 */
propertyRouter.patch(
  "/:id/statut",
  authMiddlware,
  requirePermission("property:manage"),
  updatePropertyStatut
);

/**
 * @swagger
 * /api/properties/{id}/margin-override:
 *   patch:
 *     summary: Définit ou retire l'override de pourcentage de marge d'un bien (GOAL 9) — seul point d'entrée pour cette valeur, journalisé (MarginHistory + timeline)
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               percentage:
 *                 type: number
 *                 nullable: true
 *                 description: "0-100, ou null pour retirer l'override et revenir au défaut du type"
 *     responses:
 *       200:
 *         description: Override mis à jour
 *       400:
 *         description: Pourcentage invalide ou déjà appliqué
 *       404:
 *         description: Propriété non trouvée
 */
propertyRouter.patch(
  "/:id/margin-override",
  authMiddlware,
  requirePermission("property:margin:manage"),
  updatePropertyMarginOverride
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
 * /api/properties/{id}/images/{imageId}:
 *   delete:
 *     summary: Supprime une image d'un bien (GOAL 2)
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: Image supprimée avec succès
 *       404:
 *         description: Image non trouvée
 */
propertyRouter.delete(
  "/:id/images/:imageId",
  authMiddlware,
  requirePermission("property:manage"),
  deletePropertyImage
);

/**
 * @swagger
 * /api/properties/{id}/images/reorder:
 *   patch:
 *     summary: Réorganise la galerie d'images d'un bien (GOAL 2)
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderedIds]
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Ordre mis à jour
 */
propertyRouter.patch(
  "/:id/images/reorder",
  authMiddlware,
  requirePermission("property:manage"),
  reorderPropertyImages
);

/**
 * @swagger
 * /api/properties/{id}/videos:
 *   post:
 *     summary: Ajoute des vidéos à un bien (GOAL 2, jamais recompressées côté serveur)
 *     tags: [Properties]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Vidéos ajoutées avec succès
 */
propertyRouter.post(
  "/:id/videos",
  authMiddlware,
  requirePermission("property:manage"),
  uploadVideo.array("video", 5),
  normalizeUploadPaths,
  addPropertyVideos
);

/**
 * @swagger
 * /api/properties/{id}/videos/{videoId}:
 *   delete:
 *     summary: Supprime une vidéo d'un bien (GOAL 2)
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: Vidéo supprimée avec succès
 *       404:
 *         description: Vidéo non trouvée
 */
propertyRouter.delete(
  "/:id/videos/:videoId",
  authMiddlware,
  requirePermission("property:manage"),
  deletePropertyVideo
);

/**
 * @swagger
 * /api/properties/{id}/videos/reorder:
 *   patch:
 *     summary: Réorganise les vidéos d'un bien (GOAL 2)
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *             schema:
 *               type: object
 *               required: [orderedIds]
 *               properties:
 *                 orderedIds:
 *                   type: array
 *                   items:
 *                     type: integer
 *     responses:
 *       200:
 *         description: Ordre mis à jour
 */
propertyRouter.patch(
  "/:id/videos/reorder",
  authMiddlware,
  requirePermission("property:manage"),
  reorderPropertyVideos
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

/**
 * @swagger
 * /api/properties/{id}/restore:
 *   post:
 *     summary: Restaure un bien supprimé (soft delete, BACK-G21)
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Propriété restaurée
 *       400:
 *         description: Ce bien n'est pas supprimé
 *       404:
 *         description: Propriété non trouvée
 */
propertyRouter.post(
  "/:id/restore",
  authMiddlware,
  requirePermission("property:manage"),
  restoreProperty
);

/**
 * @swagger
 * /api/properties/{id}/archive:
 *   post:
 *     summary: Archive un bien (archivage métier, BACK-G21) — distinct de la suppression
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bien archivé
 *       400:
 *         description: Motif manquant ou déjà archivé
 *       404:
 *         description: Propriété non trouvée
 */
propertyRouter.post(
  "/:id/archive",
  authMiddlware,
  requirePermission("property:manage"),
  archiveProperty
);

/**
 * @swagger
 * /api/properties/{id}/unarchive:
 *   post:
 *     summary: Désarchive un bien (BACK-G21)
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bien désarchivé
 *       400:
 *         description: N'est pas archivé
 *       404:
 *         description: Propriété non trouvée
 */
propertyRouter.post(
  "/:id/unarchive",
  authMiddlware,
  requirePermission("property:manage"),
  unarchiveProperty
);

export default propertyRouter;
