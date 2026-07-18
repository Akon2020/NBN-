import { Op } from "sequelize";
import {
  Task,
  TaskAssignee,
  Reminder,
  Client,
  Person,
  CalendarEvent,
  CalendarEventParticipant,
  User,
} from "../models/index.model.js";
import { createNotification } from "../services/notification.service.js";

const EVENT_INCLUDES = [
  { model: User, as: "creator", attributes: ["idUser", "fullName"] },
  { model: User, as: "owner", attributes: ["idUser", "fullName"] },
  {
    model: CalendarEventParticipant,
    as: "participants",
    include: [{ model: User, as: "user", attributes: ["idUser", "fullName"] }],
  },
];

// CLAUDE.md §4 — vue agrégée, jamais une duplication systématique.
// Chaque source garde son statut de vérité propre (Task.statut,
// Reminder.statut, Client.statutRelance) ; le calendrier ne fait que
// projeter une date sur une frise, jamais une copie qui pourrait diverger.
const parseRange = (query) => {
  const from = query.from ? new Date(query.from) : new Date();
  const to = query.to ? new Date(query.to) : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { from, to };
};

export const getCalendarEvents = async (req, res, next) => {
  try {
    const { from, to } = parseRange(req.query);
    const dateRange = { [Op.between]: [from, to] };

    // GOAL 11 — un bien concerné par un rendez-vous (participant) doit le
    // voir dans son calendrier même s'il n'en est ni le propriétaire
    // (`idUser`) ni le créateur. Résolu en deux temps pour éviter qu'un
    // LEFT JOIN sur `participants` ne duplique les lignes d'un événement
    // ayant plusieurs participants.
    const participantEventIds = (
      await CalendarEventParticipant.findAll({
        where: { idUser: req.user.idUser },
        attributes: ["idCalendarEvent"],
      })
    ).map((p) => p.idCalendarEvent);

    const [tasks, reminders, clientsWithRelance, calendarEvents] = await Promise.all([
      Task.findAll({
        where: { dateEcheance: dateRange },
        include: [{ model: TaskAssignee, as: "assignees", attributes: ["idUser"] }],
      }),
      Reminder.findAll({
        where: { idUser: req.user.idUser, dueAt: dateRange, statut: "PLANIFIE" },
      }),
      Client.findAll({
        where: { prochaineRelance: dateRange },
        include: [{ model: Person, as: "person", attributes: ["fullName"] }],
      }),
      CalendarEvent.findAll({
        where: {
          startAt: dateRange,
          [Op.or]: [
            { idUser: req.user.idUser },
            { idUser: null },
            { idCalendarEvent: { [Op.in]: participantEventIds } },
          ],
        },
        include: [
          { model: User, as: "creator", attributes: ["idUser", "fullName"] },
          {
            model: CalendarEventParticipant,
            as: "participants",
            attributes: ["idUser"],
            separate: true,
            include: [{ model: User, as: "user", attributes: ["idUser", "fullName"] }],
          },
        ],
      }),
    ]);

    const events = [
      ...tasks.map((task) => ({
        source: "TASK",
        id: task.idTask,
        title: task.title,
        date: task.dateEcheance,
        statut: task.statut,
        priorite: task.priorite,
      })),
      ...reminders.map((reminder) => ({
        source: "REMINDER",
        id: reminder.idReminder,
        title: reminder.title,
        date: reminder.dueAt,
        statut: reminder.statut,
      })),
      ...clientsWithRelance.map((client) => ({
        source: "RELANCE_CLIENT",
        id: client.idClient,
        title: `Relance : ${client.person?.fullName || `Client #${client.idClient}`}`,
        date: client.prochaineRelance,
        statut: client.statutRelance,
      })),
      ...calendarEvents.map((event) => ({
        source: "EVENT",
        id: event.idCalendarEvent,
        title: event.title,
        description: event.description,
        date: event.startAt,
        endDate: event.endAt,
        creator: event.creator?.fullName,
        participants: (event.participants || []).map((p) => ({
          idUser: p.idUser,
          fullName: p.user?.fullName,
        })),
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json({ nombre: events.length, data: events });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 11 — notifie chaque personne concernée par un rendez-vous (le
// propriétaire s'il diffère du créateur, plus chaque participant), jamais
// le créateur lui-même (il vient de créer l'événement, pas besoin de le
// lui apprendre).
const notifyConcernedUsers = async (event, concernedUserIds, creatorId) => {
  const uniqueIds = [...new Set(concernedUserIds.filter((id) => id && id !== creatorId))];
  await Promise.all(
    uniqueIds.map((idUser) =>
      createNotification({
        idUser,
        type: "calendar:event",
        title: `Rendez-vous : ${event.title}`,
        message: new Date(event.startAt).toLocaleString("fr-FR"),
        relatedEntityType: "CalendarEvent",
        relatedEntityId: event.idCalendarEvent,
      })
    )
  );
};

// CLAUDE.md §4 — un CalendarEvent propre uniquement pour un rendez-vous
// sans lien à une autre entité (pas de duplication d'un Task/Reminder
// existant sous une autre forme).
export const createCalendarEvent = async (req, res, next) => {
  try {
    const { title, description, startAt, endAt, idUser, participantUserIds } = req.body;
    if (!title || !startAt) {
      return res.status(400).json({ message: "title et startAt sont requis." });
    }

    const owner = idUser || req.user.idUser;
    const event = await CalendarEvent.create({
      title,
      description: description || null,
      startAt,
      endAt: endAt || null,
      idUser: owner,
      createdBy: req.user.idUser,
    });

    const participantIds = Array.isArray(participantUserIds)
      ? [...new Set(participantUserIds.map(Number))]
      : [];
    if (participantIds.length) {
      await CalendarEventParticipant.bulkCreate(
        participantIds.map((idUserParticipant) => ({
          idCalendarEvent: event.idCalendarEvent,
          idUser: idUserParticipant,
        }))
      );
    }

    await notifyConcernedUsers(event, [owner, ...participantIds], req.user.idUser);

    const created = await CalendarEvent.findByPk(event.idCalendarEvent, {
      include: EVENT_INCLUDES,
    });
    return res.status(201).json({ message: "Événement créé avec succès", data: created });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 11 — modification d'un rendez-vous existant (absent jusqu'ici,
// seules création/suppression existaient). Remplace intégralement la
// liste de participants si `participantUserIds` est fourni (jamais un
// merge implicite) et notifie les nouveaux participants ajoutés.
export const updateCalendarEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Événement non trouvé" });
    }

    const { title, description, startAt, endAt, idUser, participantUserIds } = req.body;
    await event.update({
      title: title ?? event.title,
      description: description !== undefined ? description : event.description,
      startAt: startAt ?? event.startAt,
      endAt: endAt !== undefined ? endAt : event.endAt,
      idUser: idUser !== undefined ? idUser : event.idUser,
    });

    if (Array.isArray(participantUserIds)) {
      const existing = await CalendarEventParticipant.findAll({
        where: { idCalendarEvent: event.idCalendarEvent },
      });
      const existingIds = existing.map((p) => p.idUser);
      const nextIds = [...new Set(participantUserIds.map(Number))];
      const toAdd = nextIds.filter((id) => !existingIds.includes(id));
      const toRemove = existingIds.filter((id) => !nextIds.includes(id));

      if (toRemove.length) {
        await CalendarEventParticipant.destroy({
          where: { idCalendarEvent: event.idCalendarEvent, idUser: toRemove },
        });
      }
      if (toAdd.length) {
        await CalendarEventParticipant.bulkCreate(
          toAdd.map((idUserParticipant) => ({
            idCalendarEvent: event.idCalendarEvent,
            idUser: idUserParticipant,
          }))
        );
        await notifyConcernedUsers(event, toAdd, req.user.idUser);
      }
    }

    const updated = await CalendarEvent.findByPk(event.idCalendarEvent, {
      include: EVENT_INCLUDES,
    });
    return res.status(200).json({ message: "Événement mis à jour", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const deleteCalendarEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Événement non trouvé" });
    }
    await event.destroy();
    return res.status(200).json({ message: "Événement supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
