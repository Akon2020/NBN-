import { Op } from "sequelize";
import db from "../database/db.js";
import {
  Payment,
  PaymentMethod,
  CashMovement,
  LedgerEntry,
  Caisse,
  CaisseBalance,
  Currency,
  Requisition,
  User,
} from "../models/index.model.js";

const PAYMENT_INCLUDES = [
  { model: Caisse, as: "caisse", attributes: ["idCaisse", "label"] },
  { model: Currency, as: "currency" },
  { model: PaymentMethod, as: "paymentMethod" },
  { model: Requisition, as: "requisition", attributes: ["idRequisition", "nature"] },
  { model: User, as: "recorder", attributes: ["idUser", "fullName"] },
];

// CLAUDE.md §4 — Requisition (demande+approbation) → Payment (décaissement)
// → CashMovement dans une caisse précise → LedgerEntry append-only. Les
// quatre écritures (Payment, CashMovement, mise à jour du CaisseBalance,
// LedgerEntry) sont créées dans une seule transaction : soit tout réussit,
// soit rien n'est comptabilisé — jamais un état intermédiaire incohérent.
export const recordPayment = async (req, res, next) => {
  const t = await db.transaction();
  try {
    const { type, amount, currencyCode, idCaisse, idPaymentMethod, idRequisition, description } =
      req.body;

    if (!type || !amount || !currencyCode || !idCaisse || !idPaymentMethod) {
      await t.rollback();
      return res.status(400).json({
        message: "type, amount, currencyCode, idCaisse et idPaymentMethod sont requis.",
      });
    }
    if (!["ENCAISSEMENT", "DECAISSEMENT"].includes(type)) {
      await t.rollback();
      return res.status(400).json({ message: "type doit être ENCAISSEMENT ou DECAISSEMENT." });
    }
    if (Number(amount) <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "amount doit être strictement positif." });
    }

    const caisse = await Caisse.findByPk(idCaisse, { transaction: t });
    if (!caisse) {
      await t.rollback();
      return res.status(404).json({ message: "Caisse non trouvée" });
    }
    if (caisse.statut === "CLOTUREE") {
      await t.rollback();
      return res.status(400).json({ message: "Cette caisse est clôturée." });
    }

    const balance = await CaisseBalance.findOne({
      where: { idCaisse, currencyCode: currencyCode.toUpperCase() },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!balance) {
      await t.rollback();
      return res.status(400).json({
        message: "Conformité budgétaire : cette caisse ne suit pas la devise demandée.",
      });
    }

    if (idRequisition) {
      const requisition = await Requisition.findByPk(idRequisition, { transaction: t });
      if (!requisition) {
        await t.rollback();
        return res.status(404).json({ message: "Réquisition non trouvée" });
      }
      if (requisition.statut !== "APPROUVEE") {
        await t.rollback();
        return res
          .status(400)
          .json({ message: "Seule une réquisition approuvée peut déclencher un paiement." });
      }
      const alreadyPaid = await Payment.findOne({
        where: { idRequisition, statut: { [Op.ne]: "cancelled" } },
        transaction: t,
      });
      if (alreadyPaid) {
        await t.rollback();
        return res
          .status(409)
          .json({ message: "Cette réquisition a déjà donné lieu à un paiement." });
      }
    }

    const movementType = type === "ENCAISSEMENT" ? "ENTREE" : "SORTIE";
    const currentBalance = Number(balance.balance);
    const newBalance =
      movementType === "ENTREE" ? currentBalance + Number(amount) : currentBalance - Number(amount);

    if (movementType === "SORTIE" && newBalance < 0) {
      await t.rollback();
      return res.status(400).json({
        message: `Solde insuffisant : solde actuel ${currentBalance} ${currencyCode}, décaissement demandé ${amount} ${currencyCode}.`,
      });
    }

    const payment = await Payment.create(
      {
        type,
        amount,
        currencyCode: currencyCode.toUpperCase(),
        idCaisse,
        idPaymentMethod,
        idRequisition: idRequisition || null,
        description: description || null,
        recordedBy: req.user.idUser,
      },
      { transaction: t }
    );

    const cashMovement = await CashMovement.create(
      {
        idCaisse,
        currencyCode: currencyCode.toUpperCase(),
        amount,
        type: movementType,
        idPayment: payment.idPayment,
        createdBy: req.user.idUser,
      },
      { transaction: t }
    );

    await balance.update({ balance: newBalance }, { transaction: t });

    await LedgerEntry.create(
      {
        idCaisse,
        currencyCode: currencyCode.toUpperCase(),
        amount,
        type: movementType,
        balanceAfter: newBalance,
        idCashMovement: cashMovement.idCashMovement,
        description: description || null,
        createdBy: req.user.idUser,
      },
      { transaction: t }
    );

    await t.commit();

    const created = await Payment.findByPk(payment.idPayment, { include: PAYMENT_INCLUDES });
    return res.status(201).json({ message: "Paiement enregistré avec succès", data: created });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getAllPayments = async (req, res, next) => {
  try {
    const { idCaisse, type, statut } = req.query;
    const where = {};
    if (idCaisse) where.idCaisse = idCaisse;
    if (type) where.type = type;
    if (statut) where.statut = statut;

    const payments = await Payment.findAll({
      where,
      include: PAYMENT_INCLUDES,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// CLAUDE.md §4 — "corrections uniquement par annulation/contre-écriture/
// ajustement, jamais par modification silencieuse". Annuler un paiement ne
// touche jamais son CashMovement/LedgerEntry d'origine : ça crée un nouveau
// Payment de sens opposé qui traverse le même circuit, et marque
// uniquement l'original `cancelled` (statut, pas suppression).
export const cancelPayment = async (req, res, next) => {
  const t = await db.transaction();
  try {
    const original = await Payment.findByPk(req.params.id, { transaction: t });
    if (!original) {
      await t.rollback();
      return res.status(404).json({ message: "Paiement non trouvé" });
    }
    if (original.statut === "cancelled") {
      await t.rollback();
      return res.status(400).json({ message: "Ce paiement est déjà annulé." });
    }

    const balance = await CaisseBalance.findOne({
      where: { idCaisse: original.idCaisse, currencyCode: original.currencyCode },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const reversalType = original.type === "ENCAISSEMENT" ? "DECAISSEMENT" : "ENCAISSEMENT";
    const movementType = reversalType === "ENCAISSEMENT" ? "ENTREE" : "SORTIE";
    const currentBalance = Number(balance.balance);
    const newBalance =
      movementType === "ENTREE"
        ? currentBalance + Number(original.amount)
        : currentBalance - Number(original.amount);

    if (movementType === "SORTIE" && newBalance < 0) {
      await t.rollback();
      return res.status(400).json({
        message: "Solde insuffisant pour annuler ce paiement (le solde a changé depuis).",
      });
    }

    const reversal = await Payment.create(
      {
        type: reversalType,
        amount: original.amount,
        currencyCode: original.currencyCode,
        idCaisse: original.idCaisse,
        idPaymentMethod: original.idPaymentMethod,
        description: `Annulation du paiement #${original.idPayment}`,
        reversalOfPaymentId: original.idPayment,
        recordedBy: req.user.idUser,
      },
      { transaction: t }
    );

    const cashMovement = await CashMovement.create(
      {
        idCaisse: original.idCaisse,
        currencyCode: original.currencyCode,
        amount: original.amount,
        type: movementType,
        idPayment: reversal.idPayment,
        createdBy: req.user.idUser,
      },
      { transaction: t }
    );

    await balance.update({ balance: newBalance }, { transaction: t });

    await LedgerEntry.create(
      {
        idCaisse: original.idCaisse,
        currencyCode: original.currencyCode,
        amount: original.amount,
        type: movementType,
        balanceAfter: newBalance,
        idCashMovement: cashMovement.idCashMovement,
        description: `Contre-écriture — annulation du paiement #${original.idPayment}`,
        createdBy: req.user.idUser,
      },
      { transaction: t }
    );

    await original.update({ statut: "cancelled" }, { transaction: t });

    await t.commit();

    const updated = await Payment.findByPk(original.idPayment, { include: PAYMENT_INCLUDES });
    return res.status(200).json({ message: "Paiement annulé", data: updated });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// Le ledger reste strictement en lecture seule ici : aucune route
// PATCH/DELETE n'existe pour LedgerEntry, par construction (append-only).
export const getAllLedgerEntries = async (req, res, next) => {
  try {
    const { idCaisse, currencyCode } = req.query;
    const where = {};
    if (idCaisse) where.idCaisse = idCaisse;
    if (currencyCode) where.currencyCode = currencyCode.toUpperCase();

    const entries = await LedgerEntry.findAll({
      where,
      include: [
        { model: Caisse, as: "caisse", attributes: ["idCaisse", "label"] },
        { model: Currency, as: "currency" },
        { model: User, as: "creator", attributes: ["idUser", "fullName"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
