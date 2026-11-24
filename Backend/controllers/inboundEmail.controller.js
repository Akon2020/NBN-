import { Op } from "sequelize";
import { InboundEmail, InboundEmailRead, InboundEmailReply, User } from "../models/index.model.js";
import { getMailbox } from "../config/mailboxes.js";
import { accessibleMailboxes, canAccessMailbox } from "../services/inboundMail.service.js";
import {
  getEffectiveMailbox,
  removeMailboxAudience,
  saveMailboxAudience,
  validateAudience,
} from "../services/mailboxAudience.service.js";
import { sendFromMailbox } from "../services/email.service.js";

const MAX_REPLY_LENGTH = 20000;
const SNIPPET_LENGTH = 160;

const snippetOf = (text) => {
  const compact = String(text ?? "").replace(/\s+/g, " ").trim();
  return compact.length > SNIPPET_LENGTH ? `${compact.slice(0, SNIPPET_LENGTH)}...` : compact;
};

const markRead = (idInboundEmail, idUser) =>
  InboundEmailRead.upsert({ idInboundEmail, idUser, readAt: new Date() });

// Un message d'une boîte hors de l'audience de l'utilisateur répond 404,
// pas 403 : l'existence même d'un message à la direction n'a pas à être
// révélée au reste de l'équipe.
const findAccessibleEmail = async (user, id, options = {}) => {
  const email = await InboundEmail.findByPk(id, options);
  if (!email) return null;
  const mailbox = await getEffectiveMailbox(email.mailboxKey);
  return mailbox && canAccessMailbox(user, mailbox) ? { email, mailbox } : null;
};

const audienceView = ({ key, label, address, roles, users, audienceSource }) => ({
  key,
  label,
  address,
  roles,
  users,
  source: audienceSource,
});

// Seuls les membres actuels d'une boîte en règlent l'audience (règle
// contextuelle, pas une permission) : l'admin ne peut pas s'ajouter à
// direction@. Hors audience → 404, comme pour ses messages.
const findManageableMailbox = async (user, key) => {
  const mailbox = await getEffectiveMailbox(key);
  return mailbox && canAccessMailbox(user, mailbox) ? mailbox : null;
};

export const getMailboxAudiences = async (req, res, next) => {
  try {
    const data = (await accessibleMailboxes(req.user)).map(audienceView);
    return res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateMailboxAudience = async (req, res, next) => {
  try {
    const mailbox = await findManageableMailbox(req.user, req.params.key);
    if (!mailbox) return res.status(404).json({ message: "Boîte introuvable." });

    const audience = await validateAudience(req.body);
    if (audience.error) return res.status(400).json({ message: audience.error });
    if (!canAccessMailbox(req.user, { ...mailbox, ...audience })) {
      return res.status(400).json({
        message: "Vous ne pouvez pas vous retirer vous-même de cette boîte : demandez-le à un autre de ses membres.",
      });
    }

    await saveMailboxAudience(mailbox.key, audience, req.user.idUser);
    return res
      .status(200)
      .json({ message: "Audience enregistrée.", data: audienceView(await getEffectiveMailbox(mailbox.key)) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const resetMailboxAudience = async (req, res, next) => {
  try {
    const mailbox = await findManageableMailbox(req.user, req.params.key);
    if (!mailbox) return res.status(404).json({ message: "Boîte introuvable." });

    if (!canAccessMailbox(req.user, getMailbox(mailbox.key))) {
      return res.status(400).json({
        message: "Le réglage du serveur ne vous inclut pas : demandez à un autre membre de la boîte de le rétablir.",
      });
    }

    await removeMailboxAudience(mailbox.key, req.user.idUser);
    return res
      .status(200)
      .json({ message: "Réglage du serveur rétabli.", data: audienceView(await getEffectiveMailbox(mailbox.key)) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getMyMailboxes = async (req, res, next) => {
  try {
    const data = (await accessibleMailboxes(req.user)).map(({ key, label, address, canSend, canReceive }) => ({
      key,
      label,
      address,
      canSend,
      canReceive,
    }));
    return res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getInboundEmails = async (req, res, next) => {
  try {
    const keys = (await accessibleMailboxes(req.user)).map((mailbox) => mailbox.key);
    const wanted = req.query.mailbox ? keys.filter((key) => key === req.query.mailbox) : keys;
    if (!wanted.length) return res.status(200).json({ nombre: 0, data: [] });

    const where = { mailboxKey: { [Op.in]: wanted } };
    if (req.query.q) {
      const like = { [Op.like]: `%${req.query.q}%` };
      where[Op.or] = [{ subject: like }, { fromAddress: like }, { fromName: like }];
    }

    if (req.query.unread === "true") {
      const read = await InboundEmailRead.findAll({ where: { idUser: req.user.idUser }, attributes: ["idInboundEmail"] });
      if (read.length) where.idInboundEmail = { [Op.notIn]: read.map((r) => r.idInboundEmail) };
    }

    const emails = await InboundEmail.findAll({
      where,
      order: [["receivedAt", "DESC"]],
      limit: 200,
    });
    const readIds = new Set(
      (
        await InboundEmailRead.findAll({
          where: { idUser: req.user.idUser, idInboundEmail: emails.map((e) => e.idInboundEmail) },
          attributes: ["idInboundEmail"],
        })
      ).map((r) => String(r.idInboundEmail)),
    );
    // Le corps complet reste réservé au détail ; la liste n'en garde qu'un extrait.
    const data = emails.map((email) => {
      const { textBody, ...rest } = email.toJSON();
      return { ...rest, snippet: snippetOf(textBody), isRead: readIds.has(String(email.idInboundEmail)) };
    });
    return res.status(200).json({ nombre: data.length, unread: data.filter((e) => !e.isRead).length, data });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getInboundEmail = async (req, res, next) => {
  try {
    const found = await findAccessibleEmail(req.user, req.params.id, {
      include: [
        {
          model: InboundEmailReply,
          as: "replies",
          include: [{ model: User, as: "author", attributes: ["idUser", "fullName"] }],
        },
      ],
      order: [[{ model: InboundEmailReply, as: "replies" }, "createdAt", "ASC"]],
    });
    if (!found) return res.status(404).json({ message: "Message introuvable." });

    await markRead(found.email.idInboundEmail, req.user.idUser);
    return res
      .status(200)
      .json({ data: { ...found.email.toJSON(), canReply: found.mailbox.canSend, isRead: true } });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const replyToInboundEmail = async (req, res, next) => {
  try {
    const found = await findAccessibleEmail(req.user, req.params.id);
    if (!found) return res.status(404).json({ message: "Message introuvable." });
    const { email, mailbox } = found;

    const body = String(req.body?.message ?? "").trim();
    if (!body) return res.status(400).json({ message: "Le message de réponse est vide." });
    if (body.length > MAX_REPLY_LENGTH) {
      return res.status(400).json({ message: "Le message de réponse est trop long." });
    }
    if (!email.fromAddress) {
      return res.status(400).json({ message: "L'expéditeur de ce message n'a pas d'adresse exploitable." });
    }
    if (!mailbox.canSend) {
      return res.status(409).json({
        message: `La boîte ${mailbox.address} n'est pas encore configurée pour l'envoi. Répondez depuis la messagerie.`,
      });
    }

    const subject = /^re\s*:/i.test(email.subject || "") ? email.subject : `Re: ${email.subject || ""}`.trim();
    const quoted = String(email.textBody || "")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const receivedAt = new Date(email.receivedAt).toLocaleString("fr-FR", { timeZone: "Africa/Lubumbashi" });
    const isRealMessageId = email.messageId.startsWith("<");

    try {
      await sendFromMailbox(mailbox.key, {
        to: email.fromName ? { name: email.fromName, address: email.fromAddress } : email.fromAddress,
        subject,
        text: `${body}\n\nLe ${receivedAt}, ${email.fromName || email.fromAddress} a écrit :\n${quoted}`,
        ...(isRealMessageId ? { inReplyTo: email.messageId, references: [email.messageId] } : {}),
      });
    } catch (sendError) {
      await InboundEmailReply.create({
        idInboundEmail: email.idInboundEmail,
        idUser: req.user.idUser,
        body,
        statut: "FAILED",
        error: sendError.message,
      });
      return res.status(502).json({ message: "La réponse n'a pas pu être envoyée. Réessayez dans un instant." });
    }

    const reply = await InboundEmailReply.create({
      idInboundEmail: email.idInboundEmail,
      idUser: req.user.idUser,
      body,
      statut: "SENT",
    });
    await email.update({ repliedAt: new Date(), repliedBy: req.user.idUser });

    return res.status(201).json({ message: "Réponse envoyée.", data: reply });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// Lu / non lu pour l'utilisateur connecté seulement. Même règle d'accès que
// la lecture : hors audience de la boîte, 404.
export const setInboundEmailRead = async (req, res, next) => {
  try {
    const found = await findAccessibleEmail(req.user, req.params.id);
    if (!found) return res.status(404).json({ message: "Message introuvable." });

    if (req.body?.read === false) {
      await InboundEmailRead.destroy({ where: { idInboundEmail: found.email.idInboundEmail, idUser: req.user.idUser } });
    } else {
      await markRead(found.email.idInboundEmail, req.user.idUser);
    }
    return res.status(200).json({ data: { idInboundEmail: found.email.idInboundEmail, isRead: req.body?.read !== false } });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
