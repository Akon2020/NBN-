import { Router } from "express";
import {
  createCommissionnaire,
  createIncident,
  deleteCommissionnaire,
  getAllCommissionnaires,
  getCommissionnaireClients,
  getMyCommissionnaireProfile,
  getSingleCommissionnaire,
  updateCommissionnaire,
  updateCommissionnaireScore,
  getCommissionnaireStats,
  previewNextCode,
  getCommissionnaireIdentityDocument,
  replaceCommissionnaireIdentityDocument,
  sendCommissionnaireAccessKey,
} from "../controllers/commissionnaire.controller.js";
import { parseCommissionnaireUpload } from "../middlewares/collectionUpload.middleware.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const commissionnaireRouter = Router();

/**
 * @swagger
 * /api/commissionnaires/me:
 *   get:
 *     summary: Récupère la fiche commissionnaire du compte connecté (MOBILE-G04)
 *     tags: [Commissionnaires]
 *     responses:
 *       200:
 *         description: Fiche trouvée
 *       404:
 *         description: Aucune fiche commissionnaire liée à ce compte
 */
// Sa propre fiche : authentification seule (règle contextuelle), le rôle
// commissionnaire n'a pas accès à la liste des autres fiches.
commissionnaireRouter.get("/me", authMiddlware, getMyCommissionnaireProfile);

/**
 * @swagger
 * /api/commissionnaires/stats:
 *   get:
 *     summary: Nombre de commissionnaires et collecteurs actifs et inactifs
 *     description: Actifs = statut ACTIF ou OBSERVATION ; inactifs = SUSPENDU ou EXCLU.
 *     tags: [Commissionnaires]
 *     responses:
 *       200: { description: "{ total, actifs, inactifs, commissionnaires, collecteurs }" }
 */
commissionnaireRouter.get("/stats", authMiddlware, requirePermission("commissionnaires:read"), getCommissionnaireStats);

/**
 * @swagger
 * /api/commissionnaires/next-code:
 *   get:
 *     summary: Aperçu du prochain code (CMR-NNN ou CTR-NNN), sans le réserver
 *     tags: [Commissionnaires]
 *     parameters:
 *       - { in: query, name: profil, schema: { type: string, enum: [COMMISSIONNAIRE, COLLECTEUR] } }
 *     responses:
 *       200: { description: "{ profil, code }" }
 */
commissionnaireRouter.get("/next-code", authMiddlware, requirePermission("commissionnaires:manage"), previewNextCode);

/**
 * @swagger
 * /api/commissionnaires:
 *   get:
 *     summary: Liste tous les commissionnaires (fiche digitale, CDC §7)
 *     tags: [Commissionnaires]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
commissionnaireRouter.get(
  "/",
  authMiddlware,
  requirePermission("commissionnaires:read"),
  getAllCommissionnaires
);

/**
 * @swagger
 * /api/commissionnaires/{id}:
 *   get:
 *     summary: Récupère un commissionnaire par son ID (avec incidents)
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Commissionnaire trouvé
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.get(
  "/:id",
  authMiddlware,
  requirePermission("commissionnaires:read"),
  getSingleCommissionnaire
);

/**
 * @swagger
 * /api/commissionnaires/{id}/clients:
 *   get:
 *     summary: Liste les clients apportés par ce commissionnaire (GOAL 4 - Client.sourceCommissionnaireCode)
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.get(
  "/:id/clients",
  authMiddlware,
  requirePermission("clients:read"),
  getCommissionnaireClients
);



/**
 * @swagger
 * /api/commissionnaires:
 *   post:
 *     summary: Ajoute un commissionnaire (code CMR) ou un collecteur (code CTR)
 *     description: >
 *       Le code est généré par le serveur dans une transaction (séquence
 *       verrouillée, aucun doublon). Multipart : `data` (JSON ci-dessous),
 *       `pieceRecto` (obligatoire) et `pieceVerso` (facultatif), JPG, PNG ou
 *       PDF de 5 Mo maximum, stockés hors de tout dossier public.
 *     tags: [Commissionnaires]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: string
 *                 description: >
 *                   JSON { fullName, phone, email, zone, profil (COMMISSIONNAIRE | COLLECTEUR),
 *                   idDocumentType (CARTE_ELECTEUR | CARTE_IDENTITE), idNumber, idPerson?, dateDebutActivite? }
 *               pieceRecto: { type: string, format: binary }
 *               pieceVerso: { type: string, format: binary }
 *     responses:
 *       201: { description: Créé ; le code attribué est dans data.code et dans le message }
 *       400: { description: Nom, type ou numéro de pièce, ou recto manquant ; fichier refusé }
 */
commissionnaireRouter.post(
  "/",
  authMiddlware,
  requirePermission("commissionnaires:manage"),
  parseCommissionnaireUpload,
  createCommissionnaire
);

/**
 * @swagger
 * /api/commissionnaires/{id}/piece-identite:
 *   get:
 *     summary: Affiche la pièce d'identité (recto, ou verso avec ?face=verso)
 *     tags: [Commissionnaires]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: face, schema: { type: string, enum: [recto, verso] } }
 *     responses:
 *       200: { description: Fichier (no-store) }
 *       403: { description: Permission commissionnaires:identity:read manquante }
 *       404: { description: Aucune pièce }
 *   post:
 *     summary: Ajoute ou remplace la pièce d'identité (multipart pieceRecto / pieceVerso, data JSON { idDocumentType, idNumber })
 *     tags: [Commissionnaires]
 *     responses:
 *       200: { description: Pièce enregistrée, ancien fichier supprimé }
 */
/**
 * @swagger
 * /api/commissionnaires/{id}/access-key:
 *   post:
 *     summary: Crée le compte du commissionnaire si besoin et lui envoie une clé d'accès
 *     description: >
 *       Clé à usage unique (ACCESS_KEY_TTL_HOURS, 72 h par défaut) : première
 *       connexion sur /auth/activer, puis choix du mot de passe. Une nouvelle
 *       clé remplace la précédente. Envoyée par e-mail si demandé ; la réponse
 *       contient la clé et un lien WhatsApp prérempli pour l'agence.
 *     tags: [Commissionnaires]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, description: "Adresse de connexion, si la fiche n'en a pas" }
 *               sendEmail: { type: boolean, default: true }
 *     responses:
 *       200: { description: "{ accessKey, link, whatsappLink, expiresAt, emailQueued }" }
 *       400: { description: Adresse e-mail manquante ou invalide }
 *       409: { description: Adresse déjà utilisée par un autre compte }
 */
commissionnaireRouter.post(
  "/:id/access-key",
  authMiddlware,
  requirePermission("commissionnaires:manage"),
  sendCommissionnaireAccessKey
);

commissionnaireRouter.get(
  "/:id/piece-identite",
  authMiddlware,
  requirePermission("commissionnaires:identity:read"),
  getCommissionnaireIdentityDocument
);
commissionnaireRouter.post(
  "/:id/piece-identite",
  authMiddlware,
  requirePermission("commissionnaires:identity:read"),
  parseCommissionnaireUpload,
  replaceCommissionnaireIdentityDocument
);

/**
 * @swagger
 * /api/commissionnaires/{id}:
 *   patch:
 *     summary: Met à jour un commissionnaire (zone, statut Actif/Observation/Suspendu/Exclu)
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Commissionnaire mis à jour
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.patch(
  "/:id",
  authMiddlware,
  requirePermission("commissionnaires:manage"),
  updateCommissionnaire
);

/**
 * @swagger
 * /api/commissionnaires/{id}/score:
 *   patch:
 *     summary: Évalue les 4 sous-scores d'un commissionnaire (performance/qualité/discipline/engagement, /25 chacun)
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Score mis à jour, grille d'évolution réappliquée
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.patch(
  "/:id/score",
  authMiddlware,
  requirePermission("commissionnaires:manage"),
  updateCommissionnaireScore
);

/**
 * @swagger
 * /api/commissionnaires/{id}/incidents:
 *   post:
 *     summary: Enregistre un incident (retard, données incomplètes, non-respect des règles)
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Incident enregistré, score discipline réévalué
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.post(
  "/:id/incidents",
  authMiddlware,
  requirePermission("commissionnaires:manage"),
  createIncident
);

/**
 * @swagger
 * /api/commissionnaires/{id}:
 *   delete:
 *     summary: Supprime un commissionnaire
 *     tags: [Commissionnaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Commissionnaire supprimé avec succès
 *       404:
 *         description: Commissionnaire non trouvé
 */
commissionnaireRouter.delete(
  "/:id",
  authMiddlware,
  requirePermission("commissionnaires:manage"),
  deleteCommissionnaire
);

export default commissionnaireRouter;
