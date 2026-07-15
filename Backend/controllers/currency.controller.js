import { Currency } from "../models/index.model.js";

// CLAUDE.md §4 — table de référence configurable (USD/CDF pré-remplies par
// seeder). Une devise n'est jamais supprimée une fois créée (elle peut déjà
// être référencée par des CaisseBalance/ExchangeRate historiques) : on la
// désactive via `isActive` à la place.
export const getAllCurrencies = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const currencies = await Currency.findAll({
      where: includeInactive ? {} : { isActive: true },
      order: [["code", "ASC"]],
    });
    return res.status(200).json({ nombre: currencies.length, data: currencies });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createCurrency = async (req, res, next) => {
  try {
    const { code, label, symbol } = req.body;
    if (!code || !label || !symbol) {
      return res.status(400).json({ message: "code, label et symbol sont requis." });
    }

    const existing = await Currency.findByPk(code.toUpperCase());
    if (existing) {
      return res.status(409).json({ message: "Cette devise existe déjà." });
    }

    const currency = await Currency.create({ code: code.toUpperCase(), label, symbol });
    return res.status(201).json({ message: "Devise créée avec succès", data: currency });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateCurrency = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { label, symbol, isActive } = req.body;

    const currency = await Currency.findByPk(code.toUpperCase());
    if (!currency) {
      return res.status(404).json({ message: "Devise non trouvée" });
    }

    await currency.update({
      label: label ?? currency.label,
      symbol: symbol ?? currency.symbol,
      isActive: isActive ?? currency.isActive,
    });

    return res.status(200).json({ message: "Devise mise à jour", data: currency });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
