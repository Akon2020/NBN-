import { Op } from "sequelize";
import { MarginSetting, MarginHistory, Property, RentalProperty } from "../models/index.model.js";
import { recalculatePropertyMargin } from "../shared/marginCalculator.js";

const PROPERTY_TYPES = [
  "APPARTEMENT",
  "MAISON",
  "CONSTRUCTION_DURABLE",
  "CONSTRUCTION_SEMI_DURABLE",
  "TERRAIN_PLAT",
  "TERRAIN_PENTE",
];
const STAY_TYPES = ["LONGUE_DUREE", "COURT_SEJOUR"];

export const getMarginSettings = async (req, res, next) => {
  try {
    const settings = await MarginSetting.findAll({
      order: [["propertyType", "ASC"], ["stayType", "ASC"]],
    });
    return res.status(200).json({ data: settings });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 12 — un bien correspond à COURT_SEJOUR uniquement s'il est loué à
// la journée (RentalProperty.unit=DAY) ; sinon (MONTH/YEAR, ou une vente
// sans RentalProperty) il relève de LONGUE_DUREE. Résolu ici via l'ensemble
// des idProperty en location journalière plutôt qu'un appel par bien
// (évite N+1 sur un recalcul en masse potentiellement large).
const findAffectedProperties = async (propertyType, stayType) => {
  const dailyRentalIds = (
    await RentalProperty.findAll({ where: { unit: "DAY" }, attributes: ["idProperty"] })
  ).map((r) => r.idProperty);

  if (stayType === "COURT_SEJOUR") {
    if (!dailyRentalIds.length) return [];
    return Property.findAll({
      where: { propertyType, marginOverridePercentage: null, idProperty: dailyRentalIds },
    });
  }

  return Property.findAll({
    where: {
      propertyType,
      marginOverridePercentage: null,
      idProperty: dailyRentalIds.length ? { [Op.notIn]: dailyRentalIds } : { [Op.ne]: null },
    },
  });
};

// GOAL 9 — seul point d'entrée pour changer le pourcentage global d'un
// type de bien. Recalcule immédiatement `margin` sur tous les biens de ce
// type/type de séjour qui n'ont PAS d'override (marginOverridePercentage
// IS NULL) — les biens avec un override restent strictement inchangés,
// jamais affectés par ce changement global.
// GOAL 12 — `stayType` (LONGUE_DUREE/COURT_SEJOUR) est désormais requis :
// chaque combinaison type de bien × type de séjour a son propre
// pourcentage configurable indépendamment.
export const updateMarginSetting = async (req, res, next) => {
  try {
    const { propertyType } = req.params;
    const { percentage, stayType } = req.body;

    if (!PROPERTY_TYPES.includes(propertyType)) {
      return res.status(400).json({ message: "propertyType invalide." });
    }
    if (!STAY_TYPES.includes(stayType)) {
      return res.status(400).json({ message: "stayType doit être LONGUE_DUREE ou COURT_SEJOUR." });
    }
    const numeric = Number(percentage);
    if (percentage === undefined || Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
      return res.status(400).json({ message: "percentage doit être un nombre entre 0 et 100." });
    }

    const setting = await MarginSetting.findOne({ where: { propertyType, stayType } });
    if (!setting) {
      return res.status(404).json({ message: "Paramètre de marge non trouvé pour ce type/séjour." });
    }

    const previousPercentage = setting.defaultPercentage;
    if (Number(previousPercentage) === numeric) {
      return res.status(400).json({ message: "Ce type a déjà ce pourcentage." });
    }

    await setting.update({ defaultPercentage: numeric, updatedBy: req.user.idUser });

    await MarginHistory.create({
      scope: "GLOBAL",
      propertyType,
      stayType,
      previousPercentage,
      newPercentage: numeric,
      actorUserId: req.user.idUser,
    });

    const affectedProperties = await findAffectedProperties(propertyType, stayType);
    await Promise.all(
      affectedProperties.map((property) => recalculatePropertyMargin(property, { unit: stayType === "COURT_SEJOUR" ? "DAY" : "MONTH" }))
    );

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
