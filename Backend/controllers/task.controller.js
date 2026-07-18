import db from "../database/db.js";
import {
  Task,
  TaskAssignee,
  TaskPropertyLink,
  TaskClientLink,
  TaskBailleurLink,
  TaskCommissionnaireLink,
  TaskComment,
  Property,
  Client,
  Bailleur,
  Commissionnaire,
  Person,
  User,
  Reminder,
} from "../models/index.model.js";
import { recordTimelineEvent } from "../shared/timeline.js";
import { createNotification } from "../services/notification.service.js";
import { hasPermission } from "../utils/rbac.js";

const TASK_INCLUDES = [
  { model: User, as: "creator", attributes: ["idUser", "fullName"] },
  { model: TaskAssignee, as: "assignees", include: [{ model: User, as: "user", attributes: ["idUser", "fullName"] }] },
  { model: TaskPropertyLink, as: "propertyLinks", include: [{ model: Property, as: "property", attributes: ["idProperty", "quartier", "avenue"] }] },
  { model: TaskClientLink, as: "clientLinks", include: [{ model: Client, as: "client", attributes: ["idClient", "type"] }] },
  { model: TaskBailleurLink, as: "bailleurLinks", include: [{ model: Bailleur, as: "bailleur", attributes: ["idBailleur"] }] },
  {
    model: TaskCommissionnaireLink,
    as: "commissionnaireLinks",
    include: [
      {
        model: Commissionnaire,
        as: "commissionnaire",
        attributes: ["idCommissionnaire", "code"],
        include: [{ model: Person, as: "person", attributes: ["fullName"] }],
      },
    ],
  },
];

// Remplace intégralement les assignations/liens d'une tâche à partir des
// tableaux fournis — plus simple et moins sujet à erreur qu'un diff
// incrémental côté Kanban (l'UI renvoie toujours l'état complet voulu).
const syncTaskRelations = async (
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
const notifyUsers = async (userIds, excludeUserId, { type, title, message, relatedEntityId }) => {
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

// GOAL 15 — comble l'écart documenté entre `Task.dateEcheance` (présent dès
// BACK-G16) et l'absence totale de rappel programmé pour cette échéance :
// réutilise l'infrastructure Reminder/reminder.worker.js déjà existante
// (GOAL 11) plutôt que de construire un cron parallèle. Régénéré à chaque
// création/mise à jour pour ne jamais laisser un rappel obsolète (mauvaise
// échéance, assigné retiré) — seuls les rappels pas encore envoyés (statut
// PLANIFIE) sont concernés, jamais l'historique déjà envoyé.
const syncTaskDeadlineReminders = async (task, assigneeUserIds, transaction) => {
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

const getCurrentAssigneeUserIds = async (idTask, transaction) => {
  const rows = await TaskAssignee.findAll({ where: { idTask }, transaction });
  return rows.map((row) => row.idUser);
};

export const createTask = async (req, res, next) => {
  const t = await db.transaction();
  try {
    const {
      title,
      description,
      priorite,
      dateEcheance,
      assigneeUserIds,
      idProperties,
      idClients,
      idBailleurs,
      idCommissionnaires,
    } = req.body;

    if (!title) {
      await t.rollback();
      return res.status(400).json({ message: "title est requis." });
    }

    const task = await Task.create(
      {
        title,
        description: description || null,
        priorite: priorite || "NORMALE",
        dateEcheance: dateEcheance || null,
        createdBy: req.user.idUser,
      },
      { transaction: t }
    );

    await syncTaskRelations(
      task.idTask,
      { assigneeUserIds, idProperties, idClients, idBailleurs, idCommissionnaires },
      t
    );

    const currentAssigneeUserIds = await getCurrentAssigneeUserIds(task.idTask, t);
    await syncTaskDeadlineReminders(task, currentAssigneeUserIds, t);

    await t.commit();

    await recordTimelineEvent({
      entityType: "TASK",
      entityId: task.idTask,
      eventType: "CREATED",
      title: `Tâche créée : ${title}`,
      description: description || null,
      actorUserId: req.user.idUser,
    });

    // GOAL 15 — le créateur n'a pas besoin d'être notifié de sa propre
    // création ; seuls les collaborateurs assignés dès la création le sont.
    await notifyUsers(currentAssigneeUserIds, req.user.idUser, {
      type: "task:assigned",
      title: `Nouvelle tâche assignée : ${title}`,
      message: description || null,
      relatedEntityId: task.idTask,
    });

    const created = await Task.findByPk(task.idTask, { include: TASK_INCLUDES });
    return res.status(201).json({ message: "Tâche créée avec succès", data: created });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getAllTasks = async (req, res, next) => {
  try {
    const { statut, assignedToMe } = req.query;
    const where = {};
    if (statut) where.statut = statut;

    let tasks = await Task.findAll({
      where,
      include: TASK_INCLUDES,
      order: [["createdAt", "DESC"]],
    });

    if (assignedToMe === "true") {
      tasks = tasks.filter((task) =>
        task.assignees.some((a) => a.idUser === req.user.idUser)
      );
    }

    return res.status(200).json({ nombre: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getSingleTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id, { include: TASK_INCLUDES });
    if (!task) {
      return res.status(404).json({ message: "Tâche non trouvée" });
    }
    return res.status(200).json({ data: task });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  const t = await db.transaction();
  try {
    const task = await Task.findByPk(req.params.id, { transaction: t });
    if (!task) {
      await t.rollback();
      return res.status(404).json({ message: "Tâche non trouvée" });
    }

    const {
      title,
      description,
      priorite,
      dateEcheance,
      assigneeUserIds,
      idProperties,
      idClients,
      idBailleurs,
      idCommissionnaires,
    } = req.body;

    const previousAssigneeUserIds =
      assigneeUserIds !== undefined ? await getCurrentAssigneeUserIds(task.idTask, t) : [];

    await task.update(
      {
        title: title ?? task.title,
        description: description ?? task.description,
        priorite: priorite ?? task.priorite,
        dateEcheance: dateEcheance ?? task.dateEcheance,
      },
      { transaction: t }
    );

    await syncTaskRelations(
      task.idTask,
      { assigneeUserIds, idProperties, idClients, idBailleurs, idCommissionnaires },
      t
    );

    const currentAssigneeUserIds = await getCurrentAssigneeUserIds(task.idTask, t);
    await syncTaskDeadlineReminders(task, currentAssigneeUserIds, t);

    await t.commit();

    await recordTimelineEvent({
      entityType: "TASK",
      entityId: task.idTask,
      eventType: "UPDATED",
      title: "Tâche mise à jour",
      actorUserId: req.user.idUser,
    });

    if (assigneeUserIds !== undefined) {
      const newlyAssigned = currentAssigneeUserIds.filter(
        (idUser) => !previousAssigneeUserIds.includes(idUser)
      );
      await notifyUsers(newlyAssigned, req.user.idUser, {
        type: "task:assigned",
        title: `Nouvelle tâche assignée : ${task.title}`,
        message: task.description,
        relatedEntityId: task.idTask,
      });
    }

    const updated = await Task.findByPk(task.idTask, { include: TASK_INCLUDES });
    return res.status(200).json({ message: "Tâche mise à jour", data: updated });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// CLAUDE.md §4 — un changement de statut de tâche (déplacement Kanban) ne
// touche JAMAIS une ressource liée. Cette route ne fait qu'écrire
// `Task.statut`, rien d'autre — jamais de cascade vers Property.statut,
// Client.statutPipeline, etc.
export const updateTaskStatus = async (req, res, next) => {
  try {
    const { statut } = req.body;
    if (!["A_FAIRE", "EN_COURS", "EN_REVISION", "TERMINEE"].includes(statut)) {
      return res.status(400).json({ message: "Statut de tâche invalide." });
    }

    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tâche non trouvée" });
    }

    await task.update({ statut });

    await recordTimelineEvent({
      entityType: "TASK",
      entityId: task.idTask,
      eventType: "STATUT_CHANGED",
      title: `Statut : ${statut}`,
      actorUserId: req.user.idUser,
    });

    const currentAssigneeUserIds = await getCurrentAssigneeUserIds(task.idTask);
    await notifyUsers(currentAssigneeUserIds, req.user.idUser, {
      type: "task:status_changed",
      title: `Tâche « ${task.title} » — nouveau statut : ${statut}`,
      message: null,
      relatedEntityId: task.idTask,
    });

    const updated = await Task.findByPk(task.idTask, { include: TASK_INCLUDES });
    return res.status(200).json({ message: "Statut mis à jour", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tâche non trouvée" });
    }
    await Reminder.destroy({
      where: { relatedEntityType: "Task", relatedEntityId: task.idTask, statut: "PLANIFIE" },
    });
    await task.destroy();
    return res.status(200).json({ message: "Tâche supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 15 — fil de discussion par tâche. Ouvert à quiconque a tasks:read
// (même principe que le calendrier/les missions : la lecture d'une
// ressource inclut la participation à sa discussion), pas réservé à
// tasks:manage.
export const getTaskComments = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tâche non trouvée" });
    }
    const comments = await TaskComment.findAll({
      where: { idTask: req.params.id },
      include: [{ model: User, as: "author", attributes: ["idUser", "fullName"] }],
      order: [["createdAt", "ASC"]],
    });
    return res.status(200).json({ nombre: comments.length, data: comments });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createTaskComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "content est requis." });
    }

    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tâche non trouvée" });
    }

    const comment = await TaskComment.create({
      idTask: task.idTask,
      authorId: req.user.idUser,
      content: content.trim(),
    });

    await recordTimelineEvent({
      entityType: "TASK",
      entityId: task.idTask,
      eventType: "COMMENT",
      title: "Nouveau commentaire",
      description: comment.content,
      actorUserId: req.user.idUser,
    });

    const currentAssigneeUserIds = await getCurrentAssigneeUserIds(task.idTask);
    const concernedUserIds = [...currentAssigneeUserIds, task.createdBy];
    await notifyUsers(concernedUserIds, req.user.idUser, {
      type: "task:comment",
      title: `Nouveau commentaire sur « ${task.title} »`,
      message: comment.content,
      relatedEntityId: task.idTask,
    });

    const created = await TaskComment.findByPk(comment.idTaskComment, {
      include: [{ model: User, as: "author", attributes: ["idUser", "fullName"] }],
    });
    return res.status(201).json({ message: "Commentaire ajouté", data: created });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 15 — modération minimale : l'auteur peut retirer son propre
// commentaire, un titulaire de tasks:manage peut retirer n'importe lequel.
// Pas d'événement de timeline dédié à une suppression de commentaire,
// cohérent avec le reste du système où seule la substance métier est
// journalisée.
export const deleteTaskComment = async (req, res, next) => {
  try {
    const comment = await TaskComment.findOne({
      where: { idTaskComment: req.params.commentId, idTask: req.params.id },
    });
    if (!comment) {
      return res.status(404).json({ message: "Commentaire non trouvé" });
    }

    if (comment.authorId !== req.user.idUser) {
      const canManage = await hasPermission(req.user, "tasks:manage");
      if (!canManage) {
        return res.status(403).json({
          message: "Seul l'auteur ou un titulaire de tasks:manage peut supprimer ce commentaire.",
        });
      }
    }

    await comment.destroy();
    return res.status(200).json({ message: "Commentaire supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
