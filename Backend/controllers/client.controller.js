import { Client, Person } from "../models/index.model.js";

export const getAllClients = async (req, res, next) => {
  try {
    const clients = await Client.findAll({
      include: [{ model: Person, as: "person" }],
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: clients.length, data: clients });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getSingleClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await Client.findByPk(id, { include: [{ model: Person, as: "person" }] });
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }
    return res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createClient = async (req, res, next) => {
  try {
    const { idPerson, fullName, phone, email, type, ...clientFields } = req.body;

    if (!type) {
      return res.status(400).json({ message: "Le type (LOCATAIRE/ACHETEUR) est requis." });
    }

    let person;
    if (idPerson) {
      person = await Person.findByPk(idPerson);
      if (!person) {
        return res.status(404).json({ message: "Personne non trouvée." });
      }
    } else {
      if (!fullName) {
        return res.status(400).json({
          message: "idPerson ou fullName est requis pour créer un client.",
        });
      }
      person = await Person.create({ fullName, phone, email });
    }

    const client = await Client.create({
      idPerson: person.idPerson,
      type,
      ...clientFields,
      createdBy: req.user.idUser,
    });

    const clientWithPerson = await Client.findByPk(client.idClient, {
      include: [{ model: Person, as: "person" }],
    });

    return res.status(201).json({
      message: "Client créé avec succès",
      data: clientWithPerson,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    const champsModifiables = [
      "sousType",
      "source",
      "sourceCommissionnaireCode",
      "besoinTypeBien",
      "besoinUsage",
      "localisationVille",
      "localisationQuartiers",
      "localisationFlexibilite",
      "budgetMin",
      "budgetMax",
      "urgence",
      "dateSouhaitee",
      "score",
      "tags",
      "statutPipeline",
      "statutRelance",
      "dernierContact",
      "prochaineRelance",
      "notesAgent",
    ];
    const donneesAMettreAJour = {};
    champsModifiables.forEach((champ) => {
      if (req.body[champ] !== undefined) {
        donneesAMettreAJour[champ] = req.body[champ];
      }
    });

    await client.update(donneesAMettreAJour);
    const updated = await Client.findByPk(id, { include: [{ model: Person, as: "person" }] });
    return res.status(200).json({ message: "Client mis à jour", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await Client.findByPk(id);
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }
    await client.destroy();
    return res.status(200).json({ message: "Client supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
