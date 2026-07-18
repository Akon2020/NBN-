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

// GOAL 14 — détail d'une alerte (absent jusqu'ici, seule la liste existait).
export const getSingleAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findByPk(req.params.id, { include: ALERT_INCLUDES });
    if (!alert) {
      return res.status(404).json({ message: "Alerte non trouvée" });
    }
    return res.status(200).json({ data: alert });
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
// GOAL 14 — le graphe de transitions valides est désormais imposé côté
// Backend (avant cette session, n'importe quel statut → n'importe quel
// autre était accepté sans contrôle ; seule la Frontend respectait un
// ordre par convention, ce qui contredit CLAUDE.md §2.2 : le Backend
// reste la seule autorité, jamais le Frontend seul). CLOTUREE réouvrable
// n'est pas prévu (terminal) ; RESOLUE reste réouvrable vers EN_COURS si
// la résolution était prématurée.
const VALID_TRANSITIONS = {
  OUVERTE: ["RECONNUE", "ASSIGNEE"],
  RECONNUE: ["ASSIGNEE", "EN_COURS"],
  ASSIGNEE: ["EN_COURS", "RECONNUE"],
  EN_COURS: ["RESOLUE"],
  RESOLUE: ["CLOTUREE", "EN_COURS"],
  CLOTUREE: [],
};

export const transitionAlertStatus = async (req, res, next) => {
  try {
    const { statut } = req.body;
    const validStatuts = Object.keys(VALID_TRANSITIONS);
    if (!validStatuts.includes(statut)) {
      return res.status(400).json({ message: "Statut d'alerte invalide." });
    }

    const alert = await Alert.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: "Alerte non trouvée" });
    }

    if (statut === alert.statut) {
      return res.status(400).json({ message: "Cette alerte a déjà ce statut." });
    }
    if (!VALID_TRANSITIONS[alert.statut].includes(statut)) {
      return res.status(400).json({
        message: `Transition invalide : ${alert.statut} → ${statut}.`,
      });
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
    if (alert.statut === "CLOTUREE") {
      return res.status(400).json({ message: "Une alerte clôturée ne peut plus être réassignée." });
    }

    await alert.update({ assignedTo, statut: "ASSIGNEE" });

    const updated = await Alert.findByPk(alert.idAlert, { include: ALERT_INCLUDES });
    return res.status(200).json({ message: "Alerte assignée", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
