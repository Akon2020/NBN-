import { RentalRequest, Client, User, Commissionnaire, Person } from "../models/index.model.js";
import { generateRentalRequestPdf } from "../utils/reports/rentalRequestPdf.js";
import { createTaskWithRelations } from "../services/task.service.js";
import { queueEmail } from "../services/email.service.js";
import { checkEmail } from "../utils/contactValidation.js";
import { recordTimelineEvent } from "../shared/timeline.js";
import { taskAssignmentEmail } from "../utils/formEmail.templates.js";
import { FRONT_URL } from "../config/env.js";

const MAX_EXTRA_EMAILS = 10;
const MAX_NOTE_LENGTH = 2000;

// Une demande urgente donne une tâche prioritaire : l'agent qui la reçoit
// la voit en tête de son Kanban sans avoir à ouvrir la fiche.
const PRIORITE_BY_URGENCE = { IMMEDIAT: "URGENTE", "1_2_SEMAINES": "HAUTE" };

const loadRequest = (id) =>
  RentalRequest.findByPk(id, {
    include: [{ model: Client, as: "client", attributes: ["idClient", "dossierNumber", "statutPipeline"] }],
  });

const pdfFileName = (request) =>
  `fiche-demande-${request.client?.dossierNumber || request.idRentalRequest}.pdf`;

const positiveIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
    : [];

export const getRentalRequestPdf = async (req, res, next) => {
  try {
    const request = await loadRequest(req.params.id);
    if (!request) return res.status(404).json({ message: "Demande non trouvée" });

    const pdf = await generateRentalRequestPdf(request);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${pdfFileName(request)}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(Buffer.from(pdf));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

/**
 * « Assigner une tâche » depuis une demande reçue : crée la tâche (liée au
 * client et aux commissionnaires choisis) et envoie la fiche PDF par e-mail
 * à chaque personne — utilisateurs, commissionnaires, et adresses saisies à
 * la main pour quelqu'un qui n'a pas encore de compte.
 */
export const assignRentalRequest = async (req, res, next) => {
  try {
    const request = await loadRequest(req.params.id);
    if (!request) return res.status(404).json({ message: "Demande non trouvée" });

    const userIds = positiveIds(req.body?.assigneeUserIds);
    const commissionnaireIds = positiveIds(req.body?.idCommissionnaires);
    const rawEmails = Array.isArray(req.body?.extraEmails)
      ? [...new Set(req.body.extraEmails.map((email) => String(email).trim()).filter(Boolean))]
      : [];

    if (!userIds.length && !commissionnaireIds.length && !rawEmails.length) {
      return res.status(400).json({
        message: "Choisissez au moins une personne, ou saisissez une adresse e-mail.",
      });
    }
    if (rawEmails.length > MAX_EXTRA_EMAILS) {
      return res.status(400).json({ message: `${MAX_EXTRA_EMAILS} adresses e-mail au maximum.` });
    }

    const extraEmails = [];
    for (const raw of rawEmails) {
      const check = await checkEmail(raw);
      if (!check.ok) return res.status(400).json({ message: `${raw} : ${check.reason}` });
      extraEmails.push(check.email);
    }

    const users = userIds.length
      ? await User.findAll({
          where: { idUser: userIds, status: "ACTIVE" },
          attributes: ["idUser", "fullName", "email"],
        })
      : [];
    if (users.length !== userIds.length) {
      return res.status(400).json({ message: "Un des utilisateurs choisis est introuvable ou désactivé." });
    }

    const commissionnaires = commissionnaireIds.length
      ? await Commissionnaire.findAll({
          where: { idCommissionnaire: commissionnaireIds },
          include: [{ model: Person, as: "person", attributes: ["fullName", "email", "idUser"] }],
        })
      : [];
    if (commissionnaires.length !== commissionnaireIds.length) {
      return res.status(400).json({ message: "Un des commissionnaires choisis est introuvable." });
    }

    const note = String(req.body?.note ?? "").trim().slice(0, MAX_NOTE_LENGTH);
    const dateEcheance = req.body?.dateEcheance || null;
    const dossier = request.client?.dossierNumber || `DL-${request.idRentalRequest}`;

    // Un commissionnaire qui a un compte devient aussi assigné de la tâche
    // (il la voit sur son Kanban et reçoit la notification).
    const assigneeUserIds = [
      ...new Set([
        ...users.map((user) => user.idUser),
        ...commissionnaires.map((commissionnaire) => commissionnaire.person?.idUser).filter(Boolean),
      ]),
    ];

    const task = await createTaskWithRelations(
      {
        title: `Demande de location — ${request.fullName}`,
        description: [
          note || null,
          `Demande n° ${dossier}. La fiche PDF a été envoyée par e-mail aux personnes assignées.`,
          extraEmails.length ? `Fiche également envoyée à : ${extraEmails.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        priorite: PRIORITE_BY_URGENCE[request.urgence] || "NORMALE",
        dateEcheance,
        assigneeUserIds,
        idClients: request.idClient ? [request.idClient] : [],
        idCommissionnaires: commissionnaireIds,
      },
      req.user.idUser
    );

    // Destinataires uniques (une même adresse ne reçoit jamais deux fois la
    // fiche). Les comptes utilisateurs voient le lien vers la tâche.
    const recipients = new Map();
    users.forEach((user) => {
      if (user.email) recipients.set(user.email.toLowerCase(), { name: user.fullName, hasAccount: true });
    });
    const withoutEmail = [];
    commissionnaires.forEach((commissionnaire) => {
      const email = commissionnaire.person?.email?.toLowerCase();
      if (email) {
        if (!recipients.has(email)) {
          recipients.set(email, {
            name: commissionnaire.person.fullName,
            hasAccount: Boolean(commissionnaire.person.idUser),
          });
        }
      } else {
        withoutEmail.push(`${commissionnaire.person?.fullName || "Commissionnaire"} (${commissionnaire.code})`);
      }
    });
    extraEmails.forEach((email) => {
      if (!recipients.has(email)) recipients.set(email, { name: null, hasAccount: false });
    });

    const pdf = Buffer.from(await generateRentalRequestPdf(request));
    const attachment = {
      filename: pdfFileName(request),
      content: pdf.toString("base64"),
      encoding: "base64",
      contentType: "application/pdf",
    };
    const link = `${(FRONT_URL || "").replace(/\/$/, "")}/dashboard/tasks/${task.idTask}`;
    const dueDate = dateEcheance ? new Date(dateEcheance).toLocaleDateString("fr-FR") : null;

    for (const [email, { name, hasAccount }] of recipients) {
      await queueEmail({
        to: email,
        attachments: [attachment],
        ...taskAssignmentEmail({
          recipientName: name,
          clientName: request.fullName,
          assignedBy: req.user.fullName,
          note,
          dueDate,
          link,
          hasAccount,
        }),
      });
    }

    if (request.idClient) {
      await recordTimelineEvent({
        entityType: "CLIENT",
        entityId: request.idClient,
        eventType: "TASK_ASSIGNED",
        title: "Demande de location assignée",
        description: [...recipients.values()].map((r) => r.name).filter(Boolean).concat(extraEmails).join(", "),
        actorUserId: req.user.idUser,
        metadata: { idTask: task.idTask, idRentalRequest: request.idRentalRequest },
      });
    }

    return res.status(201).json({
      message: "Tâche créée et fiche envoyée.",
      data: { idTask: task.idTask, emailsQueued: recipients.size, withoutEmail },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
