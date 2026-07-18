import { Op } from "sequelize";
import db from "../database/db.js";
import {
  Caisse,
  CaisseBalance,
  CashMovement,
  LedgerEntry,
  CaisseTransfer,
  Currency,
  User,
} from "../models/index.model.js";

const CAISSE_INCLUDES = [
  { model: User, as: "responsable", attributes: ["idUser", "fullName", "email"] },
  { model: CaisseBalance, as: "balances", include: [{ model: Currency, as: "currency" }] },
];

const TRANSFER_INCLUDES = [
  { model: Caisse, as: "caisseSource", attributes: ["idCaisse", "label"] },
  { model: Caisse, as: "caisseDestination", attributes: ["idCaisse", "label"] },
  { model: User, as: "creator", attributes: ["idUser", "fullName"] },
];

export const getAllCaisses = async (req, res, next) => {
  try {
    const caisses = await Caisse.findAll({
      include: CAISSE_INCLUDES,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: caisses.length, data: caisses });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getSingleCaisse = async (req, res, next) => {
  try {
    const caisse = await Caisse.findByPk(req.params.id, { include: CAISSE_INCLUDES });
    if (!caisse) {
      return res.status(404).json({ message: "Caisse non trouvée" });
    }
    return res.status(200).json({ data: caisse });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// CLAUDE.md §4 — une CaisseBalance à zéro est créée pour chaque devise
// active dès la création de la caisse : le solde n'existe jamais de façon
// implicite, et toute devise active a systématiquement une ligne de solde
// traçable, même nulle.
export const createCaisse = async (req, res, next) => {
  try {
    const { label, responsableUserId } = req.body;
    if (!label) {
      return res.status(400).json({ message: "label est requis." });
    }

    const caisse = await Caisse.create({
      label,
      responsableUserId: responsableUserId || null,
      createdBy: req.user.idUser,
    });

    const activeCurrencies = await Currency.findAll({ where: { isActive: true } });
    await CaisseBalance.bulkCreate(
      activeCurrencies.map((currency) => ({
        idCaisse: caisse.idCaisse,
        currencyCode: currency.code,
        balance: 0,
      }))
    );

    const created = await Caisse.findByPk(caisse.idCaisse, { include: CAISSE_INCLUDES });
    return res.status(201).json({ message: "Caisse créée avec succès", data: created });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateCaisse = async (req, res, next) => {
  try {
    const { label, responsableUserId, statut } = req.body;

    const caisse = await Caisse.findByPk(req.params.id);
    if (!caisse) {
      return res.status(404).json({ message: "Caisse non trouvée" });
    }

    await caisse.update({
      label: label ?? caisse.label,
      responsableUserId: responsableUserId ?? caisse.responsableUserId,
      statut: statut ?? caisse.statut,
    });

    const updated = await Caisse.findByPk(caisse.idCaisse, { include: CAISSE_INCLUDES });
    return res.status(200).json({ message: "Caisse mise à jour", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 10 — virement entre deux caisses, même circuit comptable qu'un
// paiement (CashMovement + mise à jour CaisseBalance + LedgerEntry, dans
// une seule transaction), sauf qu'un virement produit DEUX mouvements
// (SORTIE côté source, ENTREE côté destination) ancrés au même
// CaisseTransfer plutôt qu'à un Payment. Respecte les mêmes règles
// financières que payment.controller.js : caisses ouvertes, devise suivie
// par les deux caisses, solde jamais négatif.
export const createCaisseTransfer = async (req, res, next) => {
  const t = await db.transaction();
  try {
    const { idCaisseSource, idCaisseDestination, currencyCode, amount, description } = req.body;

    if (!idCaisseSource || !idCaisseDestination || !currencyCode || !amount) {
      await t.rollback();
      return res.status(400).json({
        message: "idCaisseSource, idCaisseDestination, currencyCode et amount sont requis.",
      });
    }
    if (Number(idCaisseSource) === Number(idCaisseDestination)) {
      await t.rollback();
      return res.status(400).json({ message: "La caisse source et la caisse destination doivent être différentes." });
    }
    if (Number(amount) <= 0) {
      await t.rollback();
      return res.status(400).json({ message: "amount doit être strictement positif." });
    }

    const code = currencyCode.toUpperCase();

    const [source, destination] = await Promise.all([
      Caisse.findByPk(idCaisseSource, { transaction: t }),
      Caisse.findByPk(idCaisseDestination, { transaction: t }),
    ]);
    if (!source || !destination) {
      await t.rollback();
      return res.status(404).json({ message: "Caisse source ou destination non trouvée" });
    }
    if (source.statut === "CLOTUREE" || destination.statut === "CLOTUREE") {
      await t.rollback();
      return res.status(400).json({ message: "Une caisse clôturée ne peut ni émettre ni recevoir de virement." });
    }

    // Verrouillées dans un ordre stable (par idCaisse croissant) pour
    // éviter un interblocage si deux virements opposés s'exécutent en
    // parallèle entre les deux mêmes caisses.
    const [firstId, secondId] = [Number(idCaisseSource), Number(idCaisseDestination)].sort(
      (a, b) => a - b
    );
    const balancesById = {};
    for (const idCaisse of [firstId, secondId]) {
      const balance = await CaisseBalance.findOne({
        where: { idCaisse, currencyCode: code },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!balance) {
        await t.rollback();
        return res.status(400).json({
          message: "Conformité budgétaire : une des deux caisses ne suit pas la devise demandée.",
        });
      }
      balancesById[idCaisse] = balance;
    }
    const sourceBalance = balancesById[idCaisseSource];
    const destinationBalance = balancesById[idCaisseDestination];

    const sourceNewBalance = Number(sourceBalance.balance) - Number(amount);
    if (sourceNewBalance < 0) {
      await t.rollback();
      return res.status(400).json({
        message: `Solde insuffisant : solde actuel ${sourceBalance.balance} ${code}, virement demandé ${amount} ${code}.`,
      });
    }
    const destinationNewBalance = Number(destinationBalance.balance) + Number(amount);

    const transfer = await CaisseTransfer.create(
      {
        idCaisseSource,
        idCaisseDestination,
        currencyCode: code,
        amount,
        description: description || null,
        createdBy: req.user.idUser,
      },
      { transaction: t }
    );

    const outMovement = await CashMovement.create(
      {
        idCaisse: idCaisseSource,
        currencyCode: code,
        amount,
        type: "SORTIE",
        idCaisseTransfer: transfer.idCaisseTransfer,
        createdBy: req.user.idUser,
      },
      { transaction: t }
    );
    await sourceBalance.update({ balance: sourceNewBalance }, { transaction: t });
    await LedgerEntry.create(
      {
        idCaisse: idCaisseSource,
        currencyCode: code,
        amount,
        type: "SORTIE",
        balanceAfter: sourceNewBalance,
        idCashMovement: outMovement.idCashMovement,
        description: description || `Virement vers ${destination.label}`,
        createdBy: req.user.idUser,
      },
      { transaction: t }
    );

    const inMovement = await CashMovement.create(
      {
        idCaisse: idCaisseDestination,
        currencyCode: code,
        amount,
        type: "ENTREE",
        idCaisseTransfer: transfer.idCaisseTransfer,
        createdBy: req.user.idUser,
      },
      { transaction: t }
    );
    await destinationBalance.update({ balance: destinationNewBalance }, { transaction: t });
    await LedgerEntry.create(
      {
        idCaisse: idCaisseDestination,
        currencyCode: code,
        amount,
        type: "ENTREE",
        balanceAfter: destinationNewBalance,
        idCashMovement: inMovement.idCashMovement,
        description: description || `Virement depuis ${source.label}`,
        createdBy: req.user.idUser,
      },
      { transaction: t }
    );

    await t.commit();

    const created = await CaisseTransfer.findByPk(transfer.idCaisseTransfer, {
      include: TRANSFER_INCLUDES,
    });
    return res.status(201).json({ message: "Virement effectué avec succès", data: created });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getAllCaisseTransfers = async (req, res, next) => {
  try {
    const { idCaisse } = req.query;
    const where = idCaisse
      ? { [Op.or]: [{ idCaisseSource: idCaisse }, { idCaisseDestination: idCaisse }] }
      : {};

    const transfers = await CaisseTransfer.findAll({
      where,
      include: TRANSFER_INCLUDES,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: transfers.length, data: transfers });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
