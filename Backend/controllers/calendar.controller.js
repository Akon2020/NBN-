import { Op } from "sequelize";
import {
  Task,
  TaskAssignee,
  Reminder,
  Client,
  Person,
  CalendarEvent,
  User,
} from "../models/index.model.js";

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
          idUser: { [Op.or]: [req.user.idUser, null] },
          startAt: dateRange,
        },
        include: [{ model: User, as: "creator", attributes: ["idUser", "fullName"] }],
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
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json({ nombre: events.length, data: events });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// CLAUDE.md §4 — un CalendarEvent propre uniquement pour un rendez-vous
// sans lien à une autre entité (pas de duplication d'un Task/Reminder
// existant sous une autre forme).
export const createCalendarEvent = async (req, res, next) => {
  try {
    const { title, description, startAt, endAt, idUser } = req.body;
    if (!title || !startAt) {
      return res.status(400).json({ message: "title et startAt sont requis." });
    }

    const event = await CalendarEvent.create({
      title,
      description: description || null,
      startAt,
      endAt: endAt || null,
      idUser: idUser || req.user.idUser,
      createdBy: req.user.idUser,
    });

    return res.status(201).json({ message: "Événement créé avec succès", data: event });
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
