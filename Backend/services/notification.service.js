import { Notification, Alert, OutboxEvent, User } from "../models/index.model.js";
import { sendPushNotification } from "../utils/pushProvider.js";
import { eventBus } from "../shared/eventBus.js";

// CLAUDE.md §7 — un événement métier peut produire, indépendamment : une
// Notification (information), une Alert (suivi), un Reminder (échéance
// future), un RealtimeEvent (BACK-G18). Ce service ne fait que la partie
// Notification/Alert ; les Reminder sont créés directement là où la règle
// d'échéance est connue (pas de logique générique ici).

// Toute Notification créée met en file une tentative de push via
// OutboxEvent — jamais un envoi synchrone bloquant la requête HTTP
// d'origine, et jamais perdu si l'envoi échoue (le worker retente).
export const createNotification = async ({
  idUser,
  type,
  title,
  message,
  relatedEntityType,
  relatedEntityId,
}) => {
  const notification = await Notification.create({
    idUser,
    type,
    title,
    message: message || null,
    relatedEntityType: relatedEntityType || null,
    relatedEntityId: relatedEntityId || null,
  });

  await OutboxEvent.create({
    eventType: "notification:push",
    payload: JSON.stringify({ idNotification: notification.idNotification }),
  });

  // BACK-G18 — canal temps réel, additif : un client déconnecté de
  // Socket.IO ne perd rien (la Notification et sa tentative de push
  // existent déjà indépendamment de cette émission, `emitToUser` est un
  // no-op silencieux si Socket.IO n'est pas initialisé).
  eventBus.emit("notification:created", { notification });

  return notification;
};

export const createAlert = async ({
  type,
  title,
  description,
  severite,
  assignedTo,
  relatedEntityType,
  relatedEntityId,
  createdBy,
}) => {
  const alert = await Alert.create({
    type,
    title,
    description: description || null,
    severite: severite || "AVERTISSEMENT",
    assignedTo: assignedTo || null,
    relatedEntityType: relatedEntityType || null,
    relatedEntityId: relatedEntityId || null,
    createdBy: createdBy || null,
  });

  if (assignedTo) {
    await createNotification({
      idUser: assignedTo,
      type: `alert:${type}`,
      title: `Alerte : ${title}`,
      message: description,
      relatedEntityType: "Alert",
      relatedEntityId: alert.idAlert,
    });
  }

  eventBus.emit("alert:created", { alert });

  return alert;
};

// CLAUDE.md §4 — "Une Alert peut à son tour générer des Notification à
// chaque changement d'état." Notifie le responsable actuel (assignedTo si
// renseigné, sinon le créateur) à chaque transition de statut.
export const transitionAlert = async (alert, { statut, resolvedBy }) => {
  const isClosing = statut === "RESOLUE" || statut === "CLOTUREE";

  await alert.update({
    statut,
    resolvedBy: isClosing ? resolvedBy || alert.resolvedBy : alert.resolvedBy,
    resolvedAt: isClosing ? new Date() : alert.resolvedAt,
  });

  const notifyUserId = alert.assignedTo || alert.createdBy;
  if (notifyUserId) {
    await createNotification({
      idUser: notifyUserId,
      type: `alert:${alert.type}:${statut.toLowerCase()}`,
      title: `Alerte mise à jour : ${alert.title}`,
      message: `Nouveau statut : ${statut}`,
      relatedEntityType: "Alert",
      relatedEntityId: alert.idAlert,
    });
  }

  eventBus.emit("alert:transitioned", { alert });

  return alert;
};

export const markNotificationRead = async (notification) => {
  if (notification.isRead) return notification;
  await notification.update({ isRead: true, readAt: new Date() });
  return notification;
};

// Consommé par le worker outbox (services/outbox.worker.js) — isolé ici
// pour rester testable indépendamment du scheduler cron.
export const deliverNotificationPush = async (idNotification) => {
  const notification = await Notification.findByPk(idNotification, {
    include: [{ model: User, as: "user", attributes: ["idUser", "expoPushToken"] }],
  });
  if (!notification) {
    return { status: "FAILED", error: "Notification introuvable" };
  }

  const result = await sendPushNotification(notification.user?.expoPushToken, {
    title: notification.title,
    body: notification.message || undefined,
    data: {
      type: notification.type,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
    },
  });

  await notification.update({ pushStatus: result.status });
  return result;
};
