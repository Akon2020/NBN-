import { Router } from "express";
import {
  login,
  logout,
  logoutAll,
  refresh,
  register,
  resetPassword,
  updatePassword,
  checkAuthToken,
} from "../controllers/auth.controller.js";
import {
  authMiddlware,
  checkAuthStatus,
} from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { normalizeUploadPaths } from "../utils/normalizeUploadPaths.js";
import {
  authLimiter,
  loginAccountLimiter,
  passwordResetLimiter,
  tokenLimiter,
} from "../middlewares/rateLimit.middleware.js";

const authRouter = Router();

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Vérifie si l'utilisateur est connecté
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Statut d'authentification renvoyé
 *       401:
 *         description: Non authentifié
 */
authRouter.get("/status", authMiddlware, checkAuthStatus);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Récupère les informations de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Informations de l'utilisateur
 *       401:
 *         description: Non authentifié
 */
authRouter.get("/profile", authMiddlware, (req, res) => {
  res.json({ user: req.user, authenticated: true });
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Crée un nouveau compte utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nomComplet
 *               - email
 *               - password
 *             properties:
 *               nomComplet:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Données manquantes ou utilisateur déjà existant
 */
authRouter.post("/register", authLimiter, upload.single("avatar"), normalizeUploadPaths, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connecte un utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Email ou mot de passe incorrect
 *       403:
 *         description: >
 *           Première connexion (mot de passe par défaut ou donné par un administrateur,
 *           champ User.mustChangePassword) - aucune session ouverte ; la réponse porte
 *           requiresPasswordChange=true et un setupToken (15 min) à utiliser sur
 *           /api/auth/reset-password/confirm.
 */
authRouter.post("/login", authLimiter, loginAccountLimiter, login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rafraîchit l'access token à partir du refresh token (rotation)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Jeton rafraîchi
 *       401:
 *         description: Refresh token manquant, invalide, expiré, ou réutilisation détectée
 */
authRouter.post("/refresh", refresh);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Envoie un lien de réinitialisation (15 min, usage unique)
 *     description: >
 *       Réponse identique que le compte existe ou non (pas d'énumération).
 *       Le lien n'est jamais renvoyé dans la réponse, uniquement par e-mail.
 *       Alias historique : POST /api/auth/reset-password.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200: { description: Demande prise en compte }
 *       400: { description: Adresse e-mail invalide }
 *       429: { description: Trop de demandes }
 */
authRouter.post("/forgot-password", passwordResetLimiter, resetPassword);
authRouter.post("/reset-password", passwordResetLimiter, resetPassword);

/**
 * @swagger
 * /api/auth/token/check:
 *   post:
 *     summary: Vérifie un lien de réinitialisation ou une clé d'accès sans le consommer
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: "Valide : usage (PASSWORD_RESET, PASSWORD_SETUP, ACCESS_KEY), e-mail et nom du compte" }
 *       400: { description: "Invalide, déjà utilisé, remplacé ou expiré (champ reason)" }
 */
authRouter.post("/token/check", tokenLimiter, checkAuthToken);

/**
 * @swagger
 * /api/auth/reset-password/confirm:
 *   post:
 *     summary: Définit un mot de passe à partir d'un lien ou d'une clé à usage unique
 *     description: >
 *       Réinitialisation : sessions fermées, reconnexion demandée (signedIn=false).
 *       Clé d'accès ou premier mot de passe : session ouverte (signedIn=true).
 *       Alias historique : POST /api/auth/resetpassword.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, description: "8 caractères minimum, lettre, chiffre et symbole" }
 *     responses:
 *       200: { description: Mot de passe enregistré }
 *       400: { description: "Mot de passe trop faible, ou lien invalide, utilisé, remplacé ou expiré" }
 */
authRouter.post("/reset-password/confirm", tokenLimiter, updatePassword);
authRouter.post("/resetpassword", tokenLimiter, updatePassword);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Déconnecte l'utilisateur
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */
authRouter.post("/logout", logout);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Déconnecte toutes les sessions de l'utilisateur (tous appareils)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Déconnecté de toutes les sessions
 *       401:
 *         description: Non authentifié
 */
authRouter.post("/logout-all", authMiddlware, logoutAll);

export default authRouter;
