import { Client, Person, Matching, Property, Commissionnaire } from "../models/index.model.js";
import { createArchiveHandlers } from "../utils/archivable.js";
import { recordTimelineEvent } from "../shared/timeline.js";

// GOAL 4 — le commissionnaire source est résolu par la même association
// que le reste du modèle (jamais une jointure manuelle refaite à chaque
// endpoint), attributs limités au strict nécessaire pour l'affichage.
const CLIENT_INCLUDES = [
  { model: Person, as: "person" },
  {
    model: Commissionnaire,
    as: "commissionnaireSource",
    attributes: ["idCommissionnaire", "code"],
    include: [{ model: Person, as: "person", attributes: ["fullName"] }],
  },
];

// BACK-G21 — clients archivés désencombrés des listes actives par défaut,
// réintégrables via `?includeArchived=true` (voir property.controller.js).
export const getAllClients = async (req, res, next) => {
  try {
    const where = req.query.includeArchived === "true" ? {} : { archivedAt: null };
    const clients = await Client.findAll({
      where,
      include: CLIENT_INCLUDES,
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
    const client = await Client.findByPk(id, { include: CLIENT_INCLUDES });
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }
    return res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 4 — le code commissionnaire est la référence métier de la relation
// (jamais un idCommissionnaire interne exposé/saisi) ; on vérifie qu'il
// existe réellement avant de l'attribuer, plutôt que de ne le découvrir
// que bien plus tard au moment du calcul d'une commission.
const findCommissionnaireByCode = async (code) => {
  if (!code) return { commissionnaire: null, error: null };
  const commissionnaire = await Commissionnaire.findOne({ where: { code } });
  if (!commissionnaire) {
    return { commissionnaire: null, error: `Aucun commissionnaire avec le code "${code}".` };
  }
  return { commissionnaire, error: null };
};

export const createClient = async (req, res, next) => {
  try {
    const { idPerson, fullName, phone, email, type, ...clientFields } = req.body;

    if (!type) {
      return res.status(400).json({ message: "Le type (LOCATAIRE/ACHETEUR) est requis." });
    }

    let commissionnaire = null;
    if (clientFields.sourceCommissionnaireCode) {
      const result = await findCommissionnaireByCode(clientFields.sourceCommissionnaireCode);
      if (result.error) {
        return res.status(400).json({ message: result.error });
      }
      commissionnaire = result.commissionnaire;
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
      include: CLIENT_INCLUDES,
    });

    await recordTimelineEvent({
      entityType: "CLIENT",
      entityId: client.idClient,
      eventType: "CREATED",
      title: "Client créé",
      description: person.fullName,
      actorUserId: req.user.idUser,
    });

    if (commissionnaire) {
      await recordTimelineEvent({
        entityType: "CLIENT",
        entityId: client.idClient,
        eventType: "COMMISSIONNAIRE_ATTRIBUE",
        title: `Attribué au commissionnaire ${commissionnaire.code}`,
        actorUserId: req.user.idUser,
      });
      await recordTimelineEvent({
        entityType: "COMMISSIONNAIRE",
        entityId: commissionnaire.idCommissionnaire,
        eventType: "CLIENT_APPORTE",
        title: `Nouveau client apporté : ${person.fullName}`,
        actorUserId: req.user.idUser,
      });
    }

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

    const previousCommissionnaireCode = client.sourceCommissionnaireCode;
    let newCommissionnaire = null;
    if (
      donneesAMettreAJour.sourceCommissionnaireCode !== undefined &&
      donneesAMettreAJour.sourceCommissionnaireCode !== previousCommissionnaireCode
    ) {
      if (donneesAMettreAJour.sourceCommissionnaireCode) {
        const result = await findCommissionnaireByCode(donneesAMettreAJour.sourceCommissionnaireCode);
        if (result.error) {
          return res.status(400).json({ message: result.error });
        }
        newCommissionnaire = result.commissionnaire;
      }
    }

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

    if (
      donneesAMettreAJour.sourceCommissionnaireCode !== undefined &&
      donneesAMettreAJour.sourceCommissionnaireCode !== previousCommissionnaireCode
    ) {
      await recordTimelineEvent({
        entityType: "CLIENT",
        entityId: client.idClient,
        eventType: "COMMISSIONNAIRE_ATTRIBUE",
        title: newCommissionnaire
          ? `Attribué au commissionnaire ${newCommissionnaire.code}`
          : "Attribution commissionnaire retirée",
        actorUserId: req.user.idUser,
      });
      if (newCommissionnaire) {
        const clientPerson = await Person.findByPk(client.idPerson);
        await recordTimelineEvent({
          entityType: "COMMISSIONNAIRE",
          entityId: newCommissionnaire.idCommissionnaire,
          eventType: "CLIENT_APPORTE",
          title: `Nouveau client apporté : ${clientPerson?.fullName || `Client #${client.idClient}`}`,
          actorUserId: req.user.idUser,
        });
      }
    }

    const updated = await Client.findByPk(id, { include: CLIENT_INCLUDES });
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
