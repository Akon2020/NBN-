import { Router } from "express";
import {
  createBailleur,
  deleteBailleur,
  getAllBailleurs,
  getBailleurIdentityDocument,
  getBailleurProperties,
  getSingleBailleur,
  updateBailleur,
  uploadBailleurPhoto,
} from "../controllers/bailleur.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const bailleurRouter = Router();

/**
 * @swagger
 * /api/bailleurs:
 *   get:
 *     summary: Liste les bailleurs, par priorité (VIP, PREMIUM, STANDARD, INACTIF) puis par nom
 *     description: Chaque bailleur porte `propertiesCount` (biens à son actif).
 *     tags: [Bailleurs]
 *     parameters:
 *       - in: query
 *         name: priorite
 *         schema: { type: string, enum: [VIP, PREMIUM, STANDARD, INACTIF] }
 *       - in: query
 *         name: dossierNumber
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
bailleurRouter.get("/", authMiddlware, requirePermission("bailleurs:read"), getAllBailleurs);

/**
 * @swagger
 * /api/bailleurs/{id}:
 *   get:
 *     summary: Récupère un bailleur par son ID
 *     tags: [Bailleurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bailleur trouvé
 *       404:
 *         description: Bailleur non trouvé
 */
bailleurRouter.get(
  "/:id",
  authMiddlware,
  requirePermission("bailleurs:read"),
  getSingleBailleur
);

/**
 * @swagger
 * /api/bailleurs:
 *   post:
 *     summary: Crée un nouveau bailleur (CDC §3 module 3 "FICHE BAILLEUR")
 *     tags: [Bailleurs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               idPerson:
 *                 type: integer
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PROPRIETAIRE, MANDATAIRE]
 *     responses:
 *       201:
 *         description: Bailleur créé avec succès
 *       400:
 *         description: Données invalides
 */
bailleurRouter.post(
  "/",
  authMiddlware,
  requirePermission("bailleurs:manage"),
  createBailleur
);

/**
 * @swagger
 * /api/bailleurs/{id}:
 *   patch:
 *     summary: Met à jour un bailleur (profil agence et identité)
 *     tags: [Bailleurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               priorite: { type: string, enum: [VIP, PREMIUM, STANDARD, INACTIF] }
 *               type: { type: string, enum: [PROPRIETAIRE, MANDATAIRE, GERANT, SOCIETE] }
 *               fullName: { type: string }
 *               phone: { type: string, description: "Normalisé ; vide pour effacer" }
 *               email: { type: string, description: "Format et domaine vérifiés ; vide pour effacer" }
 *               idNumber: { type: string }
 *               statutRelation: { type: string }
 *               fiabilite: { type: string }
 *               valeurBailleur: { type: string }
 *               margeAgence: { type: number, description: "Ignorée sans bailleur:marge:read" }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Bailleur mis à jour
 *       400:
 *         description: Priorité, statut, nom, téléphone ou e-mail invalide
 *       404:
 *         description: Bailleur non trouvé
 */
bailleurRouter.patch(
  "/:id",
  authMiddlware,
  requirePermission("bailleurs:manage"),
  updateBailleur
);

/**
 * @swagger
 * /api/bailleurs/{id}:
 *   delete:
 *     summary: Supprime un bailleur
 *     tags: [Bailleurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bailleur supprimé avec succès
 *       404:
 *         description: Bailleur non trouvé
 */
bailleurRouter.delete(
  "/:id",
  authMiddlware,
  requirePermission("bailleurs:manage"),
  deleteBailleur
);

/**
 * @swagger
 * /api/bailleurs/{id}/piece-identite:
 *   get:
 *     summary: Pièce d'identité annexée au bailleur (image JPEG ou PDF)
 *     description: >
 *       Fichier stocké hors du dossier public. Réservé à
 *       `bailleurs:identity:read` (admin par défaut). La fiche du bailleur
 *       n'expose que `person.hasIdDocument`, jamais le chemin du fichier.
 *     tags: [Bailleurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Le fichier (Cache-Control private, no-store)
 *       403:
 *         description: Permission bailleurs:identity:read manquante
 *       404:
 *         description: Aucune pièce d'identité pour ce bailleur
 */
bailleurRouter.get(
  "/:id/piece-identite",
  authMiddlware,
  requirePermission("bailleurs:identity:read"),
  getBailleurIdentityDocument
);

/**
 * @swagger
 * /api/bailleurs/{id}/properties:
 *   get:
 *     summary: Biens à l'actif du bailleur (« Aperçu »)
 *     tags: [Bailleurs]
 *     responses:
 *       200:
 *         description: "{ nombre, data } — biens sérialisés (champs sensibles filtrés)"
 *       404:
 *         description: Bailleur non trouvé
 */
bailleurRouter.get(
  "/:id/properties",
  authMiddlware,
  requirePermission("bailleurs:read"),
  getBailleurProperties
);

/**
 * @swagger
 * /api/bailleurs/{id}/photo:
 *   post:
 *     summary: Remplace la photo du bailleur (image compressée à la réception)
 *     tags: [Bailleurs]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: "{ photo } — chemin sous uploads/"
 *       400:
 *         description: Aucune photo ou format refusé
 */
bailleurRouter.post(
  "/:id/photo",
  authMiddlware,
  requirePermission("bailleurs:manage"),
  upload.single("image"),
  uploadBailleurPhoto
);

export default bailleurRouter;
