import { Notification } from "../models/index.model.js";
import { markNotificationRead } from "../services/notification.service.js";

// Une Notification n'appartient qu'à son destinataire — pas de permission
// RBAC ici, la portée est déjà l'utilisateur connecté (`req.user.idUser`),
// jamais une liste globale.
export const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { idUser: req.user.idUser },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    return res.status(200).json({ nombre: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { idNotification: req.params.id, idUser: req.user.idUser },
    });
    if (!notification) {
      return res.status(404).json({ message: "Notification non trouvée" });
    }
    await markNotificationRead(notification);
    return res.status(200).json({ message: "Notification marquée lue", data: notification });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 20 — utile dès qu'une vraie page d'historique existe (au-delà de la
// cloche, plafonnée) ; portée toujours strictement l'utilisateur connecté,
// jamais un idUser arbitraire.
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { idUser: req.user.idUser, isRead: false } }
    );
    return res.status(200).json({ message: "Toutes les notifications ont été marquées comme lues" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const registerPushToken = async (req, res, next) => {
  try {
    const { expoPushToken } = req.body;
    if (!expoPushToken) {
      return res.status(400).json({ message: "expoPushToken est requis." });
    }
    req.user.expoPushToken = expoPushToken;
    await req.user.save();
    return res.status(200).json({ message: "Token push enregistré" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
