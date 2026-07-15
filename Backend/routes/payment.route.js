import { Router } from "express";
import {
  cancelPayment,
  getAllLedgerEntries,
  getAllPayments,
  recordPayment,
} from "../controllers/payment.controller.js";
import { authMiddlware } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../utils/rbac.js";

const paymentRouter = Router();

/**
 * @swagger
 * /api/payments/ledger:
 *   get:
 *     summary: Consulte le ledger append-only (aucune route de modification n'existe)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
paymentRouter.get(
  "/ledger",
  authMiddlware,
  requirePermission("payments:read"),
  getAllLedgerEntries
);

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Liste les paiements (filtres idCaisse/type/statut)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 */
paymentRouter.get("/", authMiddlware, requirePermission("payments:read"), getAllPayments);

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Enregistre un paiement (encaissement/décaissement) — génère CashMovement + LedgerEntry
 *     tags: [Treasury]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *               - currencyCode
 *               - idCaisse
 *               - idPaymentMethod
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [ENCAISSEMENT, DECAISSEMENT]
 *               amount:
 *                 type: number
 *               currencyCode:
 *                 type: string
 *               idCaisse:
 *                 type: integer
 *               idPaymentMethod:
 *                 type: integer
 *               idRequisition:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Paiement enregistré avec succès
 *       400:
 *         description: Données invalides ou solde insuffisant
 */
paymentRouter.post("/", authMiddlware, requirePermission("payments:manage"), recordPayment);

/**
 * @swagger
 * /api/payments/{id}/annuler:
 *   patch:
 *     summary: Annule un paiement (contre-écriture, jamais de modification silencieuse)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Paiement annulé
 *       404:
 *         description: Paiement non trouvé
 */
paymentRouter.patch(
  "/:id/annuler",
  authMiddlware,
  requirePermission("payments:manage"),
  cancelPayment
);

export default paymentRouter;
