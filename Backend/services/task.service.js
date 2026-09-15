import db from "../database/db.js";
import {
  Task,
  TaskAssignee,
  TaskPropertyLink,
  TaskClientLink,
  TaskBailleurLink,
  TaskCommissionnaireLink,
  Reminder,
} from "../models/index.model.js";
import { recordTimelineEvent } from "../shared/timeline.js";
import { createNotification } from "./notification.service.js";

// Logique de création/liaison des tâches, partagée par le module Tâches et
// par les écrans qui créent une tâche à partir d'une ressource métier (ex.
// « Assigner une tâche » depuis une demande de location) — une seule
// implémentation des assignations, rappels et notifications.

// Remplace intégralement les assignations/liens d'une tâche à partir des
// tableaux fournis — plus simple et moins sujet à erreur qu'un diff
// incrémental côté Kanban (l'UI renvoie toujours l'état complet voulu).
export const syncTaskRelations = async (
  idTask,
  { assigneeUserIds, idProperties, idClients, idBailleurs, idCommissionnaires },
  transaction
) => {
  if (assigneeUserIds !== undefined) {
    await TaskAssignee.destroy({ where: { idTask }, transaction });
    if (assigneeUserIds.length) {
      await TaskAssignee.bulkCreate(
        assigneeUserIds.map((idUser) => ({ idTask, idUser })),
        { transaction }
      );
    }
  }
  if (idProperties !== undefined) {
    await TaskPropertyLink.destroy({ where: { idTask }, transaction });
    if (idProperties.length) {
      await TaskPropertyLink.bulkCreate(
        idProperties.map((idProperty) => ({ idTask, idProperty })),
        { transaction }
      );
    }
  }
  if (idClients !== undefined) {
    await TaskClientLink.destroy({ where: { idTask }, transaction });
    if (idClients.length) {
      await TaskClientLink.bulkCreate(
        idClients.map((idClient) => ({ idTask, idClient })),
        { transaction }
      );
    }
  }
  if (idBailleurs !== undefined) {
    await TaskBailleurLink.destroy({ where: { idTask }, transaction });
    if (idBailleurs.length) {
      await TaskBailleurLink.bulkCreate(
        idBailleurs.map((idBailleur) => ({ idTask, idBailleur })),
        { transaction }
      );
    }
  }
  if (idCommissionnaires !== undefined) {
    await TaskCommissionnaireLink.destroy({ where: { idTask }, transaction });
    if (idCommissionnaires.length) {
      await TaskCommissionnaireLink.bulkCreate(
        idCommissionnaires.map((idCommissionnaire) => ({ idTask, idCommissionnaire })),
        { transaction }
      );
    }
  }
};

// GOAL 15 — un seul point d'entrée pour notifier un ensemble d'utilisateurs
// concernés par une tâche, jamais l'acteur qui vient de déclencher
// l'événement lui-même.
export const notifyUsers = async (userIds, excludeUserId, { type, title, message, relatedEntityId }) => {
  const uniqueIds = [...new Set(userIds.filter((id) => id && id !== excludeUserId))];
  await Promise.all(
    uniqueIds.map((idUser) =>
      createNotification({
        idUser,
        type,
        title,
        message,
        relatedEntityType: "Task",
        relatedEntityId,
      })
    )
  );
};

// GOAL 15 — rappels d'échéance via l'infrastructure Reminder existante.
// Régénérés à chaque création/mise à jour pour ne jamais laisser un rappel
// obsolète (mauvaise échéance, assigné retiré) — seuls les rappels pas
// encore envoyés (statut PLANIFIE) sont concernés.
export const syncTaskDeadlineReminders = async (task, assigneeUserIds, transaction) => {
  await Reminder.destroy({
    where: { relatedEntityType: "Task", relatedEntityId: task.idTask, statut: "PLANIFIE" },
    transaction,
  });
  if (task.dateEcheance && assigneeUserIds.length) {
    await Reminder.bulkCreate(
      assigneeUserIds.map((idUser) => ({
        idUser,
        title: `Échéance de tâche : ${task.title}`,
        message: `La tâche "${task.title}" arrive à échéance.`,
        dueAt: new Date(task.dateEcheance),
        relatedEntityType: "Task",
        relatedEntityId: task.idTask,
        createdBy: task.createdBy,
      })),
      { transaction }
    );
  }
};

export const getCurrentAssigneeUserIds = async (idTask, transaction) => {
  const rows = await TaskAssignee.findAll({ where: { idTask }, transaction });
  return rows.map((row) => row.idUser);
};

/**
 * Crée une tâche avec ses assignés, liens et rappels (transaction propre),
 * journalise la création et notifie les assignés — jamais le créateur.
 */
export const createTaskWithRelations = async (
  { title, description, priorite, dateEcheance, assigneeUserIds, idProperties, idClients, idBailleurs, idCommissionnaires },
  actorUserId
) => {
  const transaction = await db.transaction();
  let task;
  let currentAssigneeUserIds;
  try {
    task = await Task.create(
      {
        title,
        description: description || null,
        priorite: priorite || "NORMALE",
        dateEcheance: dateEcheance || null,
        createdBy: actorUserId,
      },
      { transaction }
    );

    await syncTaskRelations(
      task.idTask,
      { assigneeUserIds, idProperties, idClients, idBailleurs, idCommissionnaires },
      transaction
    );

    currentAssigneeUserIds = await getCurrentAssigneeUserIds(task.idTask, transaction);
    await syncTaskDeadlineReminders(task, currentAssigneeUserIds, transaction);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  await recordTimelineEvent({
    entityType: "TASK",
    entityId: task.idTask,
    eventType: "CREATED",
    title: `Tâche créée : ${title}`,
    description: description || null,
    actorUserId,
  });

  await notifyUsers(currentAssigneeUserIds, actorUserId, {
    type: "task:assigned",
    title: `Nouvelle tâche assignée : ${title}`,
    message: description || null,
    relatedEntityId: task.idTask,
  });

  return task;
};
