import { Router } from "express";
import { createPropertyCollection, lookupFieldAgent } from "../controllers/propertyCollection.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { agentLookupLimiter, publicFormLimiter } from "../middlewares/rateLimit.middleware.js";
import { parseCollectionUpload } from "../middlewares/collectionUpload.middleware.js";

const propertyCollectionRouter = Router();

/**
 * @swagger
 * /api/property-collections:
 *   post:
 *     summary: Enregistre un bien collecté sur le terrain - crée le bien, son bailleur et une mission de traçabilité
 *     description: >
 *       Route interne non indexée côté client, atteignable sans compte (un
 *       commissionnaire terrain ou un bailleur n'en a pas toujours).
 *       L'utilisateur connecté est tracé s'il y en a un. Le formulaire est
 *       rempli soit par le responsable du bien lui-même (e-mail requis), soit
 *       par un collecteur - commissionnaire (nom, téléphone et code CCM
 *       requis) ou membre de l'équipe (aucune identité supplémentaire).
 *       Pour joindre la pièce d'identité du responsable (obligatoire quand il
 *       remplit lui-même), envoyer un multipart/form-data avec `data` (ce même
 *       JSON, sérialisé) et `pieceIdentite` (JPEG, PNG, WebP ou PDF,
 *       MAX_ID_DOCUMENT_SIZE_MB, 8 Mo par défaut). Le fichier est stocké hors du
 *       dossier public et n'est jamais renvoyé par cette route.
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [data]
 *             properties:
 *               data:
 *                 type: string
 *                 description: Le corps JSON décrit ci-dessous, sérialisé.
 *               pieceIdentite:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             required: [remplisseur, typeMission, typeOperation, propertyType, commune, quartier, avenue, prix, bedrooms, toilets, livingRooms, kitchens, depots, responsableStatut, responsableNom, responsablePhone, responsableEmail, responsableDisponibiliteVisite, responsableAccepteCommission]
 *             properties:
 *               remplisseur:
 *                 type: string
 *                 enum: [RESPONSABLE, COLLECTEUR, COMMISSIONNAIRE]
 *               codeCollecteur:
 *                 type: string
 *                 description: Requis si remplisseur = COLLECTEUR (CTR-007), vérifié en base (fiche active). Facultatif pour un membre de l'équipe connecté.
 *               codeRemplisseur:
 *                 type: string
 *                 description: Code CMR du commissionnaire qui remplit (remplisseur = COMMISSIONNAIRE). Un commissionnaire connecté utilise toujours le sien.
 *               parCommissionnaire:
 *                 type: boolean
 *                 description: "« Ce bien a-t-il été apporté par un commissionnaire ? » Requis si remplisseur = RESPONSABLE ou COLLECTEUR."
 *               typeMission:
 *                 type: string
 *                 enum: [COLLECTE_BIEN, APPORT_CLIENT, SUIVI, MISE_A_JOUR]
 *               typeOperation:
 *                 type: string
 *                 enum: [RENT, SALE]
 *               propertyType:
 *                 type: string
 *                 enum: [APPARTEMENT, MAISON, TERRAIN, CHAMBRETTE, BUREAU, LOCAL_COMMERCIAL]
 *                 description: Liste unique de l'agence ; les anciens types restent acceptés (application mobile).
 *               commune:
 *                 type: string
 *                 enum: [IBANDA, KADUTU, BAGIRA]
 *               quartier:
 *                 type: string
 *                 description: Doit appartenir à la commune (référentiel de l'agence).
 *               avenue:
 *                 type: string
 *               prix:
 *                 type: string
 *                 description: Saisie libre ("250$"), la partie numérique est retenue.
 *               prixMinimum:
 *                 type: string
 *                 description: Facultatif, inférieur ou égal au prix. Jamais renvoyé sans property:prix_minimum:read.
 *               modalitePaiement:
 *                 type: string
 *                 enum: [AVANCE_1_GARANTIE_3, MENSUEL, AVANCE_2_GARANTIE_3, AVANCE_3_GARANTIE_2, AVANCE_3_GARANTIE_3, GARANTIE_6, AUTRE]
 *                 description: Requise pour une location.
 *               bedrooms: { type: integer, description: "0 si aucune" }
 *               toilets: { type: integer }
 *               livingRooms: { type: integer }
 *               kitchens: { type: integer }
 *               depots: { type: integer }
 *               responsableStatut:
 *                 type: string
 *                 enum: [PROPRIETAIRE, MANDATAIRE, GERANT, SOCIETE]
 *               responsableNom:
 *                 type: string
 *               responsablePhone:
 *                 type: string
 *               responsableEmail:
 *                 type: string
 *                 description: Toujours requis ; format et domaine vérifiés.
 *               responsableIdNumber:
 *                 type: string
 *               responsableDisponibiliteVisite:
 *                 type: string
 *                 enum: [OUI, NON, SUR_PROGRAMME]
 *               responsableAccepteCommission:
 *                 type: string
 *                 enum: [OUI, NON, A_NEGOCIER]
 *               codeCommissionnaire:
 *                 type: string
 *                 description: Requis si parCommissionnaire. Format CMR-042 (ancien CCM accepté), vérifié en base ; nom et téléphone repris de la fiche.
 *     responses:
 *       201:
 *         description: Bien enregistré avec succès
 *       400:
 *         description: Champ obligatoire manquant ou invalide (le message indique lequel)
 *       429:
 *         description: Trop de soumissions depuis cet appareil
 */
propertyCollectionRouter.post(
  "/",
  optionalAuth,
  publicFormLimiter,
  parseCollectionUpload,
  createPropertyCollection
);

/**
 * @swagger
 * /api/property-collections/agents/{code}:
 *   get:
 *     summary: Vérifie un code CMR ou CTR saisi dans le formulaire de collecte
 *     description: >
 *       Fiche active uniquement. Renvoie le nom, et le téléphone en clair
 *       pour un utilisateur connecté, masqué sauf les 3 derniers chiffres
 *       sinon. Limité à 30 vérifications par appareil et par quart d'heure.
 *     tags: [Properties]
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: "{ code, profil, fullName, phone }" }
 *       400: { description: Format de code invalide }
 *       404: { description: Code inconnu ou fiche inactive }
 */
propertyCollectionRouter.get("/agents/:code", agentLookupLimiter, optionalAuth, lookupFieldAgent);

export default propertyCollectionRouter;
