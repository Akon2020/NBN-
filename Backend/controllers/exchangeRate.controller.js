import { ExchangeRate, Currency, User } from "../models/index.model.js";

const EXCHANGE_RATE_INCLUDES = [
  { model: Currency, as: "from" },
  { model: Currency, as: "to" },
  { model: User, as: "creator", attributes: ["idUser", "fullName"] },
];

// CLAUDE.md §4 — utilisé uniquement pour le reporting consolidé multi-devises,
// jamais pour convertir automatiquement un solde de caisse.
export const getAllExchangeRates = async (req, res, next) => {
  try {
    const rates = await ExchangeRate.findAll({
      include: EXCHANGE_RATE_INCLUDES,
      order: [["date", "DESC"]],
    });
    return res.status(200).json({ nombre: rates.length, data: rates });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createExchangeRate = async (req, res, next) => {
  try {
    const { fromCurrency, toCurrency, rate, date, source } = req.body;
    if (!fromCurrency || !toCurrency || !rate || !date) {
      return res
        .status(400)
        .json({ message: "fromCurrency, toCurrency, rate et date sont requis." });
    }

    const exchangeRate = await ExchangeRate.create({
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      rate,
      date,
      source,
      createdBy: req.user.idUser,
    });

    const created = await ExchangeRate.findByPk(exchangeRate.idExchangeRate, {
      include: EXCHANGE_RATE_INCLUDES,
    });
    return res.status(201).json({ message: "Taux de change enregistré", data: created });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
