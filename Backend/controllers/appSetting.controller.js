import { Op } from "sequelize";
import { AppSetting } from "../models/index.model.js";
import { MAILBOX_AUDIENCES_KEY } from "../services/mailboxAudience.service.js";

// Paramètres dotés de leur propre route et de leur propre règle d'accès :
// jamais listés ni modifiés ici (settings:manage ne doit pas suffire à
// s'ajouter à la boîte de la direction).
const DEDICATED_KEYS = {
  [MAILBOX_AUDIENCES_KEY]: "Réglez l'audience d'une boîte depuis PUT /api/inbound-emails/mailboxes/:key/audience.",
};

// GOAL 13 - `value` est toujours stocké en JSON sérialisé ; on le
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
    const settings = await AppSetting.findAll({
      where: { key: { [Op.notIn]: Object.keys(DEDICATED_KEYS) } },
      order: [["key", "ASC"]],
    });
    return res.status(200).json({ data: settings.map(serialize) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// Seul point d'entrée pour modifier un paramètre - jamais de clé créée à
// la volée depuis l'API (le catalogue de clés valides vient uniquement
// des migrations, pour éviter une prolifération de paramètres non
// documentés).
// Forme attendue des paramètres structurés : une valeur invalide est
// refusée plutôt que de casser l'envoi d'un e-mail ou un calcul.
const SETTING_VALIDATORS = {
  "emails.rentalRequestAcknowledgement": (value) => {
    if (!value || typeof value !== "object") return "Objet et message sont requis.";
    if (typeof value.subject !== "string" || !value.subject.trim() || value.subject.length > 200) {
      return "L'objet est requis (200 caractères maximum).";
    }
    if (typeof value.body !== "string" || !value.body.trim() || value.body.length > 5000) {
      return "Le message est requis (5 000 caractères maximum).";
    }
    return null;
  },
  "commissions.commissionnaireRule": (value) => {
    if (!value || !["MANUEL", "POURCENTAGE", "MONTANT_FIXE"].includes(value.mode)) {
      return "Mode attendu : MANUEL, POURCENTAGE ou MONTANT_FIXE.";
    }
    if (value.mode === "MANUEL") return null;
    const numbers = [value.valeur, ...Object.values(value.parType ?? {})].filter((v) => v !== null && v !== undefined);
    if (!numbers.length || numbers.some((n) => typeof n !== "number" || !Number.isFinite(n) || n < 0)) {
      return "Indiquez une valeur positive (globale ou par type de bien).";
    }
    if (value.mode === "POURCENTAGE" && numbers.some((n) => n > 100)) return "Un pourcentage ne dépasse pas 100.";
    return null;
  },
};

export const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    if (DEDICATED_KEYS[key]) {
      return res.status(400).json({ message: DEDICATED_KEYS[key] });
    }
    if (req.body.value === undefined) {
      return res.status(400).json({ message: "value est requis." });
    }

    const invalid = SETTING_VALIDATORS[key]?.(req.body.value);
    if (invalid) return res.status(400).json({ message: invalid });

    const setting = await AppSetting.findOne({ where: { key } });
    if (!setting) {
      return res.status(404).json({ message: "Paramètre non trouvé." });
    }

    await setting.update({
      value: JSON.stringify(req.body.value),
      updatedBy: req.user.idUser,
    });

    return res
      .status(200)
      .json({ message: "Paramètre mis à jour", data: serialize(setting) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
