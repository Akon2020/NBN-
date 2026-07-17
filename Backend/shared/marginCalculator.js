import { MarginSetting } from "../models/index.model.js";

const round2 = (value) => Math.round(value * 100) / 100;

export const computeMarginAmount = (price, percentage) => {
  if (price === null || price === undefined) return null;
  if (percentage === null || percentage === undefined) return null;
  return round2(Number(price) * (Number(percentage) / 100));
};

// GOAL 9 — un override sur le bien prime toujours sur le pourcentage
// global de son type ; jamais l'inverse, et jamais de mélange des deux.
export const getEffectivePercentage = async (property, options = {}) => {
  if (
    property.marginOverridePercentage !== null &&
    property.marginOverridePercentage !== undefined
  ) {
    return Number(property.marginOverridePercentage);
  }
  const setting = await MarginSetting.findOne({
    where: { propertyType: property.propertyType },
    transaction: options.transaction,
  });
  return setting ? Number(setting.defaultPercentage) : 0;
};

// Recalcule et persiste `margin` (montant, dérivé) d'un seul bien à partir
// de son prix et de son pourcentage effectif (override ou défaut global).
// Jamais appelé pour modifier `marginOverridePercentage` lui-même — cette
// fonction ne fait que refléter l'état courant, elle ne décide rien.
export const recalculatePropertyMargin = async (property, options = {}) => {
  const percentage = await getEffectivePercentage(property, options);
  const margin = computeMarginAmount(property.price, percentage);
  await property.update({ margin }, options);
  return margin;
};
