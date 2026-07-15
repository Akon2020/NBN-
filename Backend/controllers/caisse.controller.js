import { Caisse, CaisseBalance, Currency, User } from "../models/index.model.js";

const CAISSE_INCLUDES = [
  { model: User, as: "responsable", attributes: ["idUser", "fullName", "email"] },
  { model: CaisseBalance, as: "balances", include: [{ model: Currency, as: "currency" }] },
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
