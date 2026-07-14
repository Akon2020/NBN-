import { Matching, Property, Client, Person } from "../models/index.model.js";

export const getMatchingsByClient = async (req, res, next) => {
  try {
    const { idClient } = req.params;
    const matchings = await Matching.findAll({
      where: { idClient },
      include: [{ model: Property }],
    });
    return res.status(200).json({ nombre: matchings.length, data: matchings });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getMatchingsByProperty = async (req, res, next) => {
  try {
    const { idProperty } = req.params;
    const matchings = await Matching.findAll({
      where: { idProperty },
      include: [{ model: Client, include: [{ model: Person, as: "person" }] }],
    });
    return res.status(200).json({ nombre: matchings.length, data: matchings });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// CDC §3 module 4 "MATCHING" : associer 1 client à plusieurs biens.
export const createMatching = async (req, res, next) => {
  try {
    const { idClient, idProperty } = req.body;

    if (!idClient || !idProperty) {
      return res.status(400).json({ message: "idClient et idProperty sont requis." });
    }

    const [client, property] = await Promise.all([
      Client.findByPk(idClient),
      Property.findByPk(idProperty),
    ]);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });
    if (!property) return res.status(404).json({ message: "Propriété non trouvée" });

    const [matching, created] = await Matching.findOrCreate({
      where: { idClient, idProperty },
      defaults: { createdBy: req.user.idUser },
    });

    return res.status(created ? 201 : 200).json({
      message: created ? "Matching créé avec succès" : "Ce matching existe déjà",
      data: matching,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateMatchingStatut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!statut || !["EN_COURS", "PROPOSE", "VALIDE"].includes(statut)) {
      return res.status(400).json({
        message: "statut doit être EN_COURS, PROPOSE ou VALIDE.",
      });
    }

    const matching = await Matching.findByPk(id);
    if (!matching) {
      return res.status(404).json({ message: "Matching non trouvé" });
    }

    matching.statut = statut;
    await matching.save();

    return res.status(200).json({ message: "Statut mis à jour", data: matching });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
