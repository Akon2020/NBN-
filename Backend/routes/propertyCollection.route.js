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
 *       commissionnaire terrain ou un bailleur n'en a pas toujours).
 *       L'utilisateur connecté est tracé s'il y en a un. Le formulaire est
 *       rempli soit par le responsable du bien lui-même (e-mail requis), soit
 *       par un collecteur — commissionnaire (nom, téléphone et code CCM
 *       requis) ou membre de l'équipe (aucune identité supplémentaire).
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [remplisseur, typeMission, typeOperation, propertyType, commune, quartier, avenue, prix, bedrooms, toilets, livingRooms, kitchens, depots, responsableStatut, responsableNom, responsablePhone, responsableDisponibiliteVisite, responsableAccepteCommission]
 *             properties:
 *               remplisseur:
 *                 type: string
 *                 enum: [RESPONSABLE, COLLECTEUR]
 *               parCommissionnaire:
 *                 type: boolean
 *                 description: Requis si remplisseur = COLLECTEUR.
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
 *                 description: Requis si remplisseur = RESPONSABLE ; format et domaine vérifiés.
 *               responsableIdNumber:
 *                 type: string
 *               responsableDisponibiliteVisite:
 *                 type: string
 *                 enum: [OUI, NON, SUR_PROGRAMME]
 *               responsableAccepteCommission:
 *                 type: string
 *                 enum: [OUI, NON, A_NEGOCIER]
 *               collecteurNom:
 *                 type: string
 *               collecteurPhone:
 *                 type: string
 *               codeCommissionnaire:
 *                 type: string
 *                 description: Requis si parCommissionnaire. Format CCM-042 ; un code inconnu n'empêche pas la collecte.
 *     responses:
 *       201:
 *         description: Bien enregistré avec succès
 *       400:
 *         description: Champ obligatoire manquant ou invalide (le message indique lequel)
 *       429:
 *         description: Trop de soumissions depuis cet appareil
 */
propertyCollectionRouter.post("/", publicFormLimiter, optionalAuth, createPropertyCollection);

export default propertyCollectionRouter;
