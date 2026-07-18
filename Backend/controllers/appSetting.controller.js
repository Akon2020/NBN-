import { AppSetting } from "../models/index.model.js";

// GOAL 13 — `value` est toujours stocké en JSON sérialisé ; on le
// désérialise systématiquement en sortie pour renvoyer le vrai type
// (nombre/booléen/objet) au lieu d'une chaîne brute.
const serialize = (setting) => {
  const plain = setting.toJSON();
  try {
    plain.value = JSON.parse(plain.value);
  } catch {
    // Valeur corrompue/non-JSON : renvoyée telle quelle plutôt que de
    // faire échouer toute la liste pour une seule ligne.
  }
  return plain;
};

export const getAllSettings = async (req, res, next) => {
  try {
    const settings = await AppSetting.findAll({ order: [["key", "ASC"]] });
    return res.status(200).json({ data: settings.map(serialize) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// Seul point d'entrée pour modifier un paramètre — jamais de clé créée à
// la volée depuis l'API (le catalogue de clés valides vient uniquement
// des migrations, pour éviter une prolifération de paramètres non
// documentés).
export const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    if (req.body.value === undefined) {
      return res.status(400).json({ message: "value est requis." });
    }

    const setting = await AppSetting.findOne({ where: { key } });
    if (!setting) {
      return res.status(404).json({ message: "Paramètre non trouvé." });
    }

    await setting.update({
      value: JSON.stringify(req.body.value),
      updatedBy: req.user.idUser,
    });

    return res.status(200).json({ message: "Paramètre mis à jour", data: serialize(setting) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
