import { Reminder } from "../models/index.model.js";

export const getMyReminders = async (req, res, next) => {
  try {
    const { statut } = req.query;
    const where = { idUser: req.user.idUser };
    if (statut) where.statut = statut;

    const reminders = await Reminder.findAll({
      where,
      order: [["dueAt", "ASC"]],
    });
    return res.status(200).json({ nombre: reminders.length, data: reminders });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createReminder = async (req, res, next) => {
  try {
    const { title, message, dueAt, idUser, relatedEntityType, relatedEntityId } = req.body;
    if (!title || !dueAt) {
      return res.status(400).json({ message: "title et dueAt sont requis." });
    }

    const reminder = await Reminder.create({
      idUser: idUser || req.user.idUser,
      title,
      message: message || null,
      dueAt,
      relatedEntityType: relatedEntityType || null,
      relatedEntityId: relatedEntityId || null,
      createdBy: req.user.idUser,
    });

    return res.status(201).json({ message: "Rappel programmé avec succès", data: reminder });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const cancelReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOne({
      where: { idReminder: req.params.id, idUser: req.user.idUser },
    });
    if (!reminder) {
      return res.status(404).json({ message: "Rappel non trouvé" });
    }
    if (reminder.statut !== "PLANIFIE") {
      return res.status(400).json({ message: "Seul un rappel planifié peut être annulé." });
    }

    await reminder.update({ statut: "ANNULE" });
    return res.status(200).json({ message: "Rappel annulé", data: reminder });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
