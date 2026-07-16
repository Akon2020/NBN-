import { Alert, User } from "../models/index.model.js";
import { createAlert, transitionAlert } from "../services/notification.service.js";

const ALERT_INCLUDES = [
  { model: User, as: "assignee", attributes: ["idUser", "fullName"] },
  { model: User, as: "creator", attributes: ["idUser", "fullName"] },
  { model: User, as: "resolver", attributes: ["idUser", "fullName"] },
];

export const getAllAlerts = async (req, res, next) => {
  try {
    const { statut, severite } = req.query;
    const where = {};
    if (statut) where.statut = statut;
    if (severite) where.severite = severite;

    const alerts = await Alert.findAll({
      where,
      include: ALERT_INCLUDES,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createManualAlert = async (req, res, next) => {
  try {
    const { type, title, description, severite, assignedTo } = req.body;
    if (!type || !title) {
      return res.status(400).json({ message: "type et title sont requis." });
    }

    const alert = await createAlert({
      type,
      title,
      description,
      severite,
      assignedTo,
      createdBy: req.user.idUser,
    });

    const created = await Alert.findByPk(alert.idAlert, { include: ALERT_INCLUDES });
    return res.status(201).json({ message: "Alerte créée avec succès", data: created });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// CLAUDE.md §4 — cycle de vie : ouverte → reconnue → assignée → en cours
// → résolue → clôturée. Chaque transition notifie le responsable actuel
// (services/notification.service.js `transitionAlert`).
export const transitionAlertStatus = async (req, res, next) => {
  try {
    const { statut } = req.body;
    const validStatuts = ["OUVERTE", "RECONNUE", "ASSIGNEE", "EN_COURS", "RESOLUE", "CLOTUREE"];
    if (!validStatuts.includes(statut)) {
      return res.status(400).json({ message: "Statut d'alerte invalide." });
    }

    const alert = await Alert.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: "Alerte non trouvée" });
    }

    await transitionAlert(alert, { statut, resolvedBy: req.user.idUser });

    const updated = await Alert.findByPk(alert.idAlert, { include: ALERT_INCLUDES });
    return res.status(200).json({ message: "Alerte mise à jour", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const assignAlert = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ message: "assignedTo est requis." });
    }

    const alert = await Alert.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: "Alerte non trouvée" });
    }

    await alert.update({ assignedTo, statut: "ASSIGNEE" });

    const updated = await Alert.findByPk(alert.idAlert, { include: ALERT_INCLUDES });
    return res.status(200).json({ message: "Alerte assignée", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
