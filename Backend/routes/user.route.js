import { Router } from "express";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getSingleUser,
  getUserByEmail,
  getUsersDirectory,
  updateUserPassword,
  updateUser,
} from "../controllers/user.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";
import upload from "../middlewares/upload.middleware.js";
import { normalizeUploadPaths } from "../utils/normalizeUploadPaths.js";

const userRouter = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Récupère tous les utilisateurs
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Liste des utilisateurs récupérée avec succès
 *       500:
 *         description: Erreur serveur
 */
userRouter.get("/", authMiddlware, requirePermission("users:read"), getAllUsers);

/**
 * @swagger
 * /api/users/directory:
 *   get:
 *     summary: Annuaire minimal (id/nom/rôle) pour les sélecteurs d'assignation, ouvert à tout utilisateur authentifié (GOAL 11)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
userRouter.get("/directory", authMiddlware, getUsersDirectory);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Récupère un utilisateur par son ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de l'utilisateur
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 *       400:
 *         description: Utilisateur non trouvé
 */
userRouter.get(
  "/:id",
  authMiddlware,
  requirePermission("users:read"),
  getSingleUser
);

/**
 * @swagger
 * /api/users/email/{email}:
 *   get:
 *     summary: Récupère un utilisateur par email
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Adresse email de l'utilisateur
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 *       400:
 *         description: Email invalide
 *       404:
 *         description: Utilisateur non trouvé
 */
userRouter.get(
  "/email/:email",
  authMiddlware,
  requirePermission("users:read"),
  getUserByEmail
);

/**
 * @swagger
 * /api/users/add:
 *   post:
 *     summary: Crée un nouvel utilisateur
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - nomComplet
 *               - email
 *             properties:
 *               nomComplet:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, agent, consultant]
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Utilisateur existant ou données invalides
 *       500:
 *         description: Erreur serveur
 */
userRouter.post(
  "/add",
  authMiddlware,
  requirePermission("users:manage"),
  upload.single("avatar"),
  normalizeUploadPaths,
  createUser
);

/**
 * @swagger
 * /api/users/update/{id}:
 *   patch:
 *     summary: Met à jour un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de l'utilisateur à mettre à jour
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nomComplet:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, agent, consultant]
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour avec succès
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
userRouter.patch(
  "/update/:id",
  authMiddlware,
  requirePermission("users:manage"),
  upload.single("avatar"),
  normalizeUploadPaths,
  updateUser
);

/**
 * @swagger
 * /api/users/update/{id}/password:
 *   patch:
 *     summary: Met à jour le mot de passe d'un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de l'utilisateur à mettre à jour
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmNewPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mot de passe mis à jour avec succès
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
userRouter.patch("/update/:id/password", authMiddlware, updateUserPassword);

/**
 * @swagger
 * /api/users/delete/{id}:
 *   delete:
 *     summary: Supprime un utilisateur
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de l'utilisateur à supprimer
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Utilisateur supprimé avec succès
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
userRouter.delete(
  "/delete/:id",
  authMiddlware,
  requirePermission("users:manage"),
  deleteUser
);

export default userRouter;
