import { MarginSetting, RentalProperty } from "../models/index.model.js";

const round2 = (value) => Math.round(value * 100) / 100;

export const computeMarginAmount = (price, percentage) => {
  if (price === null || price === undefined) return null;
  if (percentage === null || percentage === undefined) return null;
  return round2(Number(price) * (Number(percentage) / 100));
};

// GOAL 12 — une location facturée à la journée (RentalProperty.unit=DAY)
// est une courte durée ; tout le reste (MONTH/YEAR, ou une vente sans
// RentalProperty) reste longue durée. `unit` est le seul discriminant :
// jamais de champ dupliqué juste pour ce libellé.
export const resolveStayType = async (property, options = {}) => {
  if (options.unit !== undefined) {
    return options.unit === "DAY" ? "COURT_SEJOUR" : "LONGUE_DUREE";
  }
  if (property.category !== "RENT") return "LONGUE_DUREE";
  const rentalDetails = await RentalProperty.findOne({
    where: { idProperty: property.idProperty },
    transaction: options.transaction,
  });
  return rentalDetails?.unit === "DAY" ? "COURT_SEJOUR" : "LONGUE_DUREE";
};

// GOAL 9 — un override sur le bien prime toujours sur le pourcentage
// global de son type ; jamais l'inverse, et jamais de mélange des deux.
// GOAL 12 — le pourcentage global lui-même dépend désormais aussi du
// type de séjour (courte/longue durée), résolu via `resolveStayType`.
export const getEffectivePercentage = async (property, options = {}) => {
  if (
    property.marginOverridePercentage !== null &&
    property.marginOverridePercentage !== undefined
  ) {
    return Number(property.marginOverridePercentage);
  }
  const stayType = await resolveStayType(property, options);
  const setting = await MarginSetting.findOne({
    where: { propertyType: property.propertyType, stayType },
    transaction: options.transaction,
  });
  return setting ? Number(setting.defaultPercentage) : 0;
};

// Recalcule et persiste `margin` (montant, dérivé) d'un seul bien à partir
// de son prix et de son pourcentage effectif (override ou défaut global,
// selon son type de bien ET son type de séjour). Jamais appelé pour
// modifier `marginOverridePercentage` lui-même — cette fonction ne fait
// que refléter l'état courant, elle ne décide rien.
// `options.unit` : à fournir quand déjà connu de l'appelant (évite une
// requête RentalProperty superflue, cf. property.controller.js).
export const recalculatePropertyMargin = async (property, options = {}) => {
  const percentage = await getEffectivePercentage(property, options);
  const margin = computeMarginAmount(property.price, percentage);
  await property.update({ margin }, options);
  return margin;
};
