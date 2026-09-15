import { Op } from "sequelize";
import { InboundEmail, InboundEmailReply, User } from "../models/index.model.js";
import { getMailbox } from "../config/mailboxes.js";
import { accessibleMailboxes, canAccessMailbox } from "../services/inboundMail.service.js";
import { sendFromMailbox } from "../services/email.service.js";

const MAX_REPLY_LENGTH = 20000;

// Un message d'une boîte hors de l'audience de l'utilisateur répond 404,
// pas 403 : l'existence même d'un message à la direction n'a pas à être
// révélée au reste de l'équipe.
const findAccessibleEmail = async (user, id, options = {}) => {
  const email = await InboundEmail.findByPk(id, options);
  if (!email) return null;
  const mailbox = getMailbox(email.mailboxKey);
  return mailbox && canAccessMailbox(user, mailbox) ? { email, mailbox } : null;
};

export const getMyMailboxes = async (req, res, next) => {
  try {
    const data = accessibleMailboxes(req.user).map(({ key, label, address, canSend, canReceive }) => ({
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
    const keys = accessibleMailboxes(req.user).map((mailbox) => mailbox.key);
    const wanted = req.query.mailbox ? keys.filter((key) => key === req.query.mailbox) : keys;
    if (!wanted.length) return res.status(200).json({ nombre: 0, data: [] });

    const where = { mailboxKey: { [Op.in]: wanted } };
    if (req.query.q) {
      const like = { [Op.like]: `%${req.query.q}%` };
      where[Op.or] = [{ subject: like }, { fromAddress: like }, { fromName: like }];
    }

    const emails = await InboundEmail.findAll({
      where,
      attributes: { exclude: ["textBody"] },
      order: [["receivedAt", "DESC"]],
      limit: 200,
    });
    return res.status(200).json({ nombre: emails.length, data: emails });
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

    return res.status(200).json({ data: { ...found.email.toJSON(), canReply: found.mailbox.canSend } });
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
