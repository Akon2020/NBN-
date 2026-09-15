import db from "../database/db.js";
import { Proposal, Property, PropertyImage, Client, Person, User } from "../models/index.model.js";
import { recordTimelineEvent } from "../shared/timeline.js";

const CHANNELS = ["WHATSAPP", "EMAIL", "AUTRE"];
const CHANNEL_LABELS = { WHATSAPP: "WhatsApp", EMAIL: "e-mail", AUTRE: "autre canal" };
const MAX_PROPERTIES_PER_BATCH = 20;

// Ce qu'un historique de propositions montre d'un bien : ce que le client a
// reçu, jamais le bailleur, le prix plancher, la marge ni l'informateur —
// données confidentielles réservées aux onglets Bailleurs et Galerie.
const PROPOSED_PROPERTY_ATTRIBUTES = [
  "idProperty",
  "category",
  "propertyType",
  "commune",
  "quartier",
  "avenue",
  "bedrooms",
  "livingRooms",
  "toilets",
  "kitchens",
  "price",
  "statut",
];

const proposedPropertyInclude = {
  model: Property,
  as: "property",
  attributes: PROPOSED_PROPERTY_ATTRIBUTES,
  // Un bien retiré depuis reste lisible dans l'historique du client.
  paranoid: false,
  include: [
    {
      model: PropertyImage,
      as: "images",
      attributes: ["idPropertyImage", "image", "order"],
      separate: true,
      order: [["order", "ASC"]],
      limit: 1,
    },
  ],
};

const senderInclude = { model: User, as: "sender", attributes: ["idUser", "fullName"] };

export const getAllProposals = async (req, res, next) => {
  try {
    const proposals = await Proposal.findAll({
      include: [
        proposedPropertyInclude,
        { model: Client, as: "client", include: [{ model: Person, as: "person" }] },
        senderInclude,
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
      include: [proposedPropertyInclude, senderInclude],
      order: [["sentAt", "DESC"]],
    });
    return res.status(200).json({ nombre: proposals.length, data: proposals });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// BACK-G07 — trace l'envoi d'une proposition unitaire à un Client réel.
export const createProposal = async (req, res, next) => {
  try {
    const { idProperty, idClient, message, channel } = req.body;

    if (!idProperty || !idClient) {
      return res
        .status(400)
        .json({ message: "idProperty et idClient sont requis." });
    }
    if (channel && !CHANNELS.includes(channel)) {
      return res.status(400).json({ message: "Canal d'envoi invalide." });
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
      channel: channel || null,
      sentBy: req.user.idUser,
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

/**
 * Envoi d'une sélection du panier à un client : une Proposal par bien, dans
 * une seule transaction. Un client encore « Nouveau » passe à « Proposé » —
 * c'est littéralement ce qui vient de se produire. Un dossier plus avancé
 * (visite, négociation…) ne recule jamais.
 */
export const createProposalBatch = async (req, res, next) => {
  try {
    const { idClient, channel, message } = req.body ?? {};
    const idProperties = Array.isArray(req.body?.idProperties)
      ? [...new Set(req.body.idProperties.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
      : [];

    if (!idClient || !idProperties.length) {
      return res.status(400).json({ message: "Le client et au moins un bien sont requis." });
    }
    if (idProperties.length > MAX_PROPERTIES_PER_BATCH) {
      return res.status(400).json({ message: `${MAX_PROPERTIES_PER_BATCH} biens au maximum par envoi.` });
    }
    if (channel && !CHANNELS.includes(channel)) {
      return res.status(400).json({ message: "Canal d'envoi invalide." });
    }

    const client = await Client.findByPk(idClient);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });

    const found = await Property.count({ where: { idProperty: idProperties } });
    if (found !== idProperties.length) {
      return res.status(404).json({ message: "Un des biens proposés est introuvable." });
    }

    const transaction = await db.transaction();
    let created;
    const pipelineAdvanced = client.statutPipeline === "NOUVEAU";
    try {
      const sentAt = new Date();
      created = await Proposal.bulkCreate(
        idProperties.map((idProperty) => ({
          idProperty,
          idClient: client.idClient,
          channel: channel || null,
          message: message || null,
          sentBy: req.user.idUser,
          sentAt,
        })),
        { transaction }
      );
      if (pipelineAdvanced) {
        await client.update({ statutPipeline: "PROPOSE" }, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    await recordTimelineEvent({
      entityType: "CLIENT",
      entityId: client.idClient,
      eventType: "PROPOSALS_SENT",
      title: `${created.length} bien(s) proposé(s)${channel ? ` par ${CHANNEL_LABELS[channel]}` : ""}`,
      actorUserId: req.user.idUser,
      metadata: { idProperties },
    });
    if (pipelineAdvanced) {
      await recordTimelineEvent({
        entityType: "CLIENT",
        entityId: client.idClient,
        eventType: "STATUT_CHANGED",
        title: "Pipeline : Nouveau → Proposé",
        actorUserId: req.user.idUser,
      });
    }

    const total = await Proposal.count({ where: { idClient: client.idClient } });
    return res.status(201).json({
      message: "Propositions enregistrées",
      data: { created: created.length, total, pipelineAdvanced },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
