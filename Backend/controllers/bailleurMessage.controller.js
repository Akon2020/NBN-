import { Op } from "sequelize";
import { Bailleur, BailleurMessage, InboundEmail, Person, User } from "../models/index.model.js";
import { queueEmail } from "../services/email.service.js";
import { accessibleMailboxes } from "../services/inboundMail.service.js";
import { bailleurMessageEmail, personalizeMessage } from "../utils/formEmail.templates.js";

const MAX_RECIPIENTS = 100;
const MAX_SUBJECT = 200;
const MAX_BODY = 10000;
const CONTACT_CHANNELS = ["APPEL", "WHATSAPP", "SMS", "EMAIL"];

const positiveIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
    : [];

/**
 * Bouton « Emails » : un même message à une sélection de bailleurs, envoyé
 * depuis contact@ (outbox, retenté en cas d'échec). « {nom} » est remplacé
 * par le nom de chaque bailleur. Chaque envoi est tracé dans l'historique du
 * bailleur et met à jour son dernier contact.
 */
export const sendBailleurEmails = async (req, res, next) => {
  try {
    const idBailleurs = positiveIds(req.body?.idBailleurs);
    const subject = String(req.body?.subject ?? "").trim();
    const message = String(req.body?.message ?? "").trim();

    if (!idBailleurs.length) return res.status(400).json({ message: "Choisissez au moins un bailleur." });
    if (idBailleurs.length > MAX_RECIPIENTS) {
      return res.status(400).json({ message: `${MAX_RECIPIENTS} bailleurs au maximum par envoi.` });
    }
    if (!subject || subject.length > MAX_SUBJECT) {
      return res.status(400).json({ message: "L'objet est requis (200 caractères maximum)." });
    }
    if (!message || message.length > MAX_BODY) {
      return res.status(400).json({ message: "Le message est requis (10 000 caractères maximum)." });
    }

    const bailleurs = await Bailleur.findAll({
      where: { idBailleur: idBailleurs },
      include: [{ model: Person, as: "person", attributes: ["fullName", "email"] }],
    });
    if (bailleurs.length !== idBailleurs.length) {
      return res.status(404).json({ message: "Un des bailleurs choisis est introuvable." });
    }

    const now = new Date();
    const withoutEmail = [];
    let sent = 0;
    for (const bailleur of bailleurs) {
      const email = bailleur.person?.email;
      if (!email) {
        withoutEmail.push(bailleur.person?.fullName || bailleur.dossierNumber);
        continue;
      }
      const body = personalizeMessage(message, bailleur.person.fullName);
      const personalizedSubject = personalizeMessage(subject, bailleur.person.fullName);
      const event = await queueEmail({
        to: email,
        subject: personalizedSubject,
        text: body,
        mailboxKey: "contact",
        ...bailleurMessageEmail({ body }),
      });
      await BailleurMessage.create({
        idBailleur: bailleur.idBailleur,
        channel: "EMAIL",
        subject: personalizedSubject,
        body,
        statut: "ENVOYE",
        idOutboxEvent: event.idOutboxEvent,
        sentBy: req.user.idUser,
        sentAt: now,
      });
      await bailleur.update({ dernierContact: now });
      sent += 1;
    }

    return res.status(201).json({ message: "Messages mis en envoi", data: { sent, withoutEmail } });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// « Contacts » : l'agent a lancé un appel, un WhatsApp ou un SMS depuis le
// site. L'échange part de son téléphone ; on en garde la trace.
export const logBailleurContact = async (req, res, next) => {
  try {
    const { idBailleur, channel } = req.body ?? {};
    if (!CONTACT_CHANNELS.includes(channel)) return res.status(400).json({ message: "Canal de contact invalide." });

    const bailleur = await Bailleur.findByPk(idBailleur);
    if (!bailleur) return res.status(404).json({ message: "Bailleur non trouvé" });

    const now = new Date();
    const entry = await BailleurMessage.create({
      idBailleur: bailleur.idBailleur,
      channel,
      body: String(req.body?.body ?? "").trim().slice(0, MAX_BODY) || null,
      statut: "ENVOYE",
      sentBy: req.user.idUser,
      sentAt: now,
    });
    await bailleur.update({ dernierContact: now });

    return res.status(201).json({ message: "Contact enregistré", data: entry });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

/**
 * Historique des échanges d'un bailleur : ce que l'agence lui a envoyé, et
 * ses messages reçus sur les boîtes professionnelles — uniquement celles
 * dont l'utilisateur fait partie de l'audience (direction@ reste privée).
 */
export const getBailleurMessages = async (req, res, next) => {
  try {
    const bailleur = await Bailleur.findByPk(req.params.idBailleur, {
      include: [{ model: Person, as: "person", attributes: ["email"] }],
    });
    if (!bailleur) return res.status(404).json({ message: "Bailleur non trouvé" });

    const sent = await BailleurMessage.findAll({
      where: { idBailleur: bailleur.idBailleur },
      include: [{ model: User, as: "sender", attributes: ["idUser", "fullName"] }],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    let received = [];
    const email = bailleur.person?.email?.toLowerCase();
    const mailboxKeys = accessibleMailboxes(req.user).map((mailbox) => mailbox.key);
    if (email && mailboxKeys.length) {
      received = await InboundEmail.findAll({
        where: { fromAddress: email, mailboxKey: { [Op.in]: mailboxKeys } },
        attributes: ["idInboundEmail", "mailboxAddress", "subject", "receivedAt", "repliedAt"],
        order: [["receivedAt", "DESC"]],
        limit: 20,
      });
    }

    return res.status(200).json({ data: { sent, received } });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
