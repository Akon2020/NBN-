import { MarginSetting, MarginHistory, Property } from "../models/index.model.js";
import { recalculatePropertyMargin } from "../shared/marginCalculator.js";

const PROPERTY_TYPES = [
  "APPARTEMENT",
  "MAISON",
  "CONSTRUCTION_DURABLE",
  "CONSTRUCTION_SEMI_DURABLE",
  "TERRAIN_PLAT",
  "TERRAIN_PENTE",
];

export const getMarginSettings = async (req, res, next) => {
  try {
    const settings = await MarginSetting.findAll({ order: [["propertyType", "ASC"]] });
    return res.status(200).json({ data: settings });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 9 — seul point d'entrée pour changer le pourcentage global d'un
// type de bien. Recalcule immédiatement `margin` sur tous les biens de ce
// type qui n'ont PAS d'override (marginOverridePercentage IS NULL) — les
// biens avec un override restent strictement inchangés, jamais affectés
// par ce changement global.
export const updateMarginSetting = async (req, res, next) => {
  try {
    const { propertyType } = req.params;
    const { percentage } = req.body;

    if (!PROPERTY_TYPES.includes(propertyType)) {
      return res.status(400).json({ message: "propertyType invalide." });
    }
    const numeric = Number(percentage);
    if (percentage === undefined || Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
      return res.status(400).json({ message: "percentage doit être un nombre entre 0 et 100." });
    }

    const setting = await MarginSetting.findOne({ where: { propertyType } });
    if (!setting) {
      return res.status(404).json({ message: "Paramètre de marge non trouvé pour ce type." });
    }

    const previousPercentage = setting.defaultPercentage;
    if (Number(previousPercentage) === numeric) {
      return res.status(400).json({ message: "Ce type a déjà ce pourcentage." });
    }

    await setting.update({ defaultPercentage: numeric, updatedBy: req.user.idUser });

    await MarginHistory.create({
      scope: "GLOBAL",
      propertyType,
      previousPercentage,
      newPercentage: numeric,
      actorUserId: req.user.idUser,
    });

    const affectedProperties = await Property.findAll({
      where: { propertyType, marginOverridePercentage: null },
    });
    await Promise.all(affectedProperties.map((property) => recalculatePropertyMargin(property)));

    return res.status(200).json({
      message: "Pourcentage de marge mis à jour",
      data: setting,
      propertiesRecalculated: affectedProperties.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getMarginHistory = async (req, res, next) => {
  try {
    const history = await MarginHistory.findAll({
      order: [["createdAt", "DESC"]],
      limit: 100,
      include: [
        { association: "property", attributes: ["idProperty", "quartier", "avenue"] },
        { association: "actor", attributes: ["idUser", "fullName"] },
      ],
    });
    return res.status(200).json({ data: history });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
