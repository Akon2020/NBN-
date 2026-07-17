import { Client, Person, Matching, Property } from "../models/index.model.js";
import { createArchiveHandlers } from "../utils/archivable.js";
import { recordTimelineEvent } from "../shared/timeline.js";

// BACK-G21 — clients archivés désencombrés des listes actives par défaut,
// réintégrables via `?includeArchived=true` (voir property.controller.js).
export const getAllClients = async (req, res, next) => {
  try {
    const where = req.query.includeArchived === "true" ? {} : { archivedAt: null };
    const clients = await Client.findAll({
      where,
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

    await recordTimelineEvent({
      entityType: "CLIENT",
      entityId: client.idClient,
      eventType: "CREATED",
      title: "Client créé",
      description: person.fullName,
      actorUserId: req.user.idUser,
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

    const previousStatutPipeline = client.statutPipeline;
    await client.update(donneesAMettreAJour);

    if (
      donneesAMettreAJour.statutPipeline &&
      donneesAMettreAJour.statutPipeline !== previousStatutPipeline
    ) {
      await recordTimelineEvent({
        entityType: "CLIENT",
        entityId: client.idClient,
        eventType: "STATUT_PIPELINE_CHANGED",
        title: `Pipeline : ${previousStatutPipeline} → ${donneesAMettreAJour.statutPipeline}`,
        actorUserId: req.user.idUser,
      });

      // GOAL 1 — une transaction conclue occupe/vend automatiquement le
      // bien validé par le Matching (jamais de transition automatique
      // inverse : une correction manuelle reste possible via le PATCH
      // dédié du cycle de vie, cf. property.controller.js).
      if (donneesAMettreAJour.statutPipeline === "CONCLU") {
        const validatedMatchings = await Matching.findAll({
          where: { idClient: client.idClient, statut: "VALIDE" },
        });
        for (const matching of validatedMatchings) {
          const property = await Property.findByPk(matching.idProperty);
          if (!property) continue;
          const nextStatut = property.category === "SALE" ? "VENDU" : "OCCUPE_CLIENT_NBN";
          if (property.statut === nextStatut) continue;
          const previousPropertyStatut = property.statut;
          await property.update({ statut: nextStatut });
          await recordTimelineEvent({
            entityType: "PROPERTY",
            entityId: property.idProperty,
            eventType: "STATUS_CHANGED",
            title: `Statut : ${previousPropertyStatut} → ${nextStatut}`,
            description: "Transition automatique — transaction client conclue",
            metadata: { automatic: true, idClient: client.idClient },
            actorUserId: req.user.idUser,
          });
        }
      }
    }

    const updated = await Client.findByPk(id, { include: [{ model: Person, as: "person" }] });
    return res.status(200).json({ message: "Client mis à jour", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// BACK-G21 — `client.destroy()` est désormais un soft delete (paranoid) :
// réversible via `restoreClient`, invisible en usage normal.
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

export const restoreClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await Client.findByPk(id, { paranoid: false });
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }
    if (!client.deletedAt) {
      return res.status(400).json({ message: "Ce client n'est pas supprimé" });
    }
    await client.restore();
    return res.status(200).json({ message: "Client restauré avec succès", data: client });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const { archiveResource: archiveClient, unarchiveResource: unarchiveClient } =
  createArchiveHandlers(Client, "idClient", "Client non trouvé");
