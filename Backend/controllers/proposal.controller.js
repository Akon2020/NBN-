import { Proposal, Property, Client, Person } from "../models/index.model.js";

export const getAllProposals = async (req, res, next) => {
  try {
    const proposals = await Proposal.findAll({
      include: [
        { model: Property },
        { model: Client, include: [{ model: Person, as: "person" }] },
      ],
      order: [["sentAt", "DESC"]],
    });
    return res.status(200).json({ nombre: proposals.length, data: proposals });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getProposalsByClient = async (req, res, next) => {
  try {
    const { idClient } = req.params;
    const proposals = await Proposal.findAll({
      where: { idClient },
      include: [{ model: Property }],
      order: [["sentAt", "DESC"]],
    });
    return res.status(200).json({ nombre: proposals.length, data: proposals });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// BACK-G07 — trace l'envoi d'une proposition (ex. via le bouton "Proposer"
// / intégration WhatsApp du CDC) à un Client réel.
export const createProposal = async (req, res, next) => {
  try {
    const { idProperty, idClient, message } = req.body;

    if (!idProperty || !idClient) {
      return res
        .status(400)
        .json({ message: "idProperty et idClient sont requis." });
    }

    const property = await Property.findByPk(idProperty);
    if (!property) {
      return res.status(404).json({ message: "Propriété non trouvée" });
    }

    const client = await Client.findByPk(idClient);
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    const proposal = await Proposal.create({
      idProperty,
      idClient,
      message,
      sentAt: new Date(),
    });

    return res.status(201).json({
      message: "Proposition enregistrée avec succès",
      data: proposal,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
