import { AppSetting } from "../models/index.model.js";

// GOAL 13 — lecture d'un paramètre depuis le code métier (pas une route
// HTTP) : utilisé pour les interrupteurs de fonctionnalité consultés au
// fil d'un traitement existant (ex. createIncident dans
// commissionnaire.controller.js). `fallback` s'applique si la clé
// n'existe pas ou si sa valeur est corrompue — jamais une exception qui
// bloquerait le traitement appelant pour un paramètre de confort.
export const getSettingValue = async (key, fallback = null) => {
  const setting = await AppSetting.findOne({ where: { key } });
  if (!setting) return fallback;
  try {
    return JSON.parse(setting.value);
  } catch {
    return fallback;
  }
};
