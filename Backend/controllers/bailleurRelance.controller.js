import db from "../database/db.js";
import { Bailleur, BailleurMessage, BailleurRelance, Person, User } from "../models/index.model.js";
import { processRelance } from "../services/bailleurRelance.service.js";
import { personalizeMessage } from "../utils/formEmail.templates.js";
import { normalizePhone } from "../utils/contactValidation.js";

const CHANNELS = ["EMAIL", "WHATSAPP"];
const MAX_RECIPIENTS = 200;
const MAX_MESSAGE = 5000;

const positiveIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
    : [];

const recipientInclude = {
  model: Bailleur,
  as: "bailleur",
  attributes: ["idBailleur", "dossierNumber", "priorite"],
  include: [{ model: Person, as: "person", attributes: ["fullName", "email", "phone"] }],
};

/**
 * « Relances » : une date, un canal, un message modifiable et des bailleurs.
 * Les bailleurs injoignables par ce canal (sans e-mail / sans numéro) sont
 * écartés et signalés. Une date déjà passée part immédiatement.
 */
export const createRelance = async (req, res, next) => {
  try {
    const { channel } = req.body ?? {};
    const idBailleurs = positiveIds(req.body?.idBailleurs);
    const message = String(req.body?.message ?? "").trim();
    const subject = String(req.body?.subject ?? "").trim();
    const scheduledAt = new Date(req.body?.scheduledAt);

    if (!CHANNELS.includes(channel)) return res.status(400).json({ message: "Choisissez le canal : e-mail ou WhatsApp." });
    if (!idBailleurs.length) return res.status(400).json({ message: "Choisissez au moins un bailleur." });
    if (idBailleurs.length > MAX_RECIPIENTS) {
      return res.status(400).json({ message: `${MAX_RECIPIENTS} bailleurs au maximum par relance.` });
    }
    if (Number.isNaN(scheduledAt.getTime())) return res.status(400).json({ message: "La date de relance est invalide." });
    if (!message || message.length > MAX_MESSAGE) {
      return res.status(400).json({ message: "Le message est requis (5 000 caractères maximum)." });
    }
    if (channel === "EMAIL" && (!subject || subject.length > 200)) {
      return res.status(400).json({ message: "L'objet de l'e-mail est requis (200 caractères maximum)." });
    }

    const bailleurs = await Bailleur.findAll({
      where: { idBailleur: idBailleurs },
      include: [{ model: Person, as: "person", attributes: ["fullName", "email", "phone"] }],
    });
    if (bailleurs.length !== idBailleurs.length) {
      return res.status(404).json({ message: "Un des bailleurs choisis est introuvable." });
    }

    const reachable = bailleurs.filter((b) =>
      channel === "EMAIL" ? Boolean(b.person?.email) : Boolean(normalizePhone(b.person?.phone ?? ""))
    );
    const skipped = bailleurs.filter((b) => !reachable.includes(b)).map((b) => b.person?.fullName || b.dossierNumber);
    if (!reachable.length) {
      return res.status(400).json({
        message: channel === "EMAIL" ? "Aucun bailleur choisi n'a d'adresse e-mail." : "Aucun bailleur choisi n'a de numéro valide.",
        skipped,
      });
    }

    const transaction = await db.transaction();
    let relance;
    try {
      relance = await BailleurRelance.create(
        {
          channel,
          subject: channel === "EMAIL" ? subject : null,
          message,
          scheduledAt,
          createdBy: req.user.idUser,
        },
        { transaction }
      );
      await BailleurMessage.bulkCreate(
        reachable.map((bailleur) => ({
          idBailleur: bailleur.idBailleur,
          idRelance: relance.idRelance,
          channel,
          subject: channel === "EMAIL" ? personalizeMessage(subject, bailleur.person.fullName) : null,
          body: personalizeMessage(message, bailleur.person.fullName),
          statut: "PLANIFIE",
          sentBy: req.user.idUser,
        })),
        { transaction }
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // Échéance déjà atteinte : traité tout de suite, sans attendre le cron.
    if (scheduledAt <= new Date()) {
      const [claimed] = await BailleurRelance.update(
        { statut: "EN_COURS" },
        { where: { idRelance: relance.idRelance, statut: "PLANIFIEE" } }
      );
      if (claimed) await processRelance(relance);
      await relance.reload();
    }

    return res.status(201).json({
      message: "Relance programmée",
      data: { idRelance: relance.idRelance, statut: relance.statut, recipients: reachable.length, skipped },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// Historique des relances, avec le décompte des messages par statut.
export const getRelances = async (req, res, next) => {
  try {
    const relances = await BailleurRelance.findAll({
      include: [
        { model: BailleurMessage, as: "messages", attributes: ["statut"] },
        { model: User, as: "creator", attributes: ["idUser", "fullName"] },
      ],
      order: [["scheduledAt", "DESC"]],
      limit: 100,
    });

    const data = relances.map((relance) => {
      const { messages, ...plain } = relance.toJSON();
      const counts = messages.reduce((acc, m) => ({ ...acc, [m.statut]: (acc[m.statut] || 0) + 1 }), {});
      return { ...plain, recipients: messages.length, counts };
    });
    return res.status(200).json({ nombre: data.length, data });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getRelance = async (req, res, next) => {
  try {
    const relance = await BailleurRelance.findByPk(req.params.id, {
      include: [
        { model: BailleurMessage, as: "messages", include: [recipientInclude] },
        { model: User, as: "creator", attributes: ["idUser", "fullName"] },
      ],
    });
    if (!relance) return res.status(404).json({ message: "Relance introuvable." });
    return res.status(200).json({ data: relance });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const cancelRelance = async (req, res, next) => {
  try {
    const relance = await BailleurRelance.findByPk(req.params.id);
    if (!relance) return res.status(404).json({ message: "Relance introuvable." });
    if (relance.statut !== "PLANIFIEE") {
      return res.status(409).json({ message: "Seule une relance encore planifiée peut être annulée." });
    }
    await relance.update({ statut: "ANNULEE" });
    await BailleurMessage.update({ statut: "ANNULE" }, { where: { idRelance: relance.idRelance, statut: "PLANIFIE" } });
    return res.status(200).json({ message: "Relance annulée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// WhatsApp : l'agent a ouvert et envoyé le message depuis son téléphone.
export const markRelanceMessageSent = async (req, res, next) => {
  try {
    const message = await BailleurMessage.findByPk(req.params.idMessage, {
      include: [{ model: Bailleur, as: "bailleur" }],
    });
    if (!message || !message.idRelance) return res.status(404).json({ message: "Message introuvable." });
    if (message.statut !== "A_ENVOYER") {
      return res.status(409).json({ message: "Ce message n'est pas en attente d'envoi." });
    }

    const now = new Date();
    await message.update({ statut: "ENVOYE", sentAt: now, sentBy: req.user.idUser });
    await message.bailleur.update({ dernierContact: now });

    const remaining = await BailleurMessage.count({ where: { idRelance: message.idRelance, statut: "A_ENVOYER" } });
    if (!remaining) {
      await BailleurRelance.update({ statut: "TERMINEE" }, { where: { idRelance: message.idRelance } });
    }

    return res.status(200).json({ message: "Message marqué envoyé", data: { remaining } });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
