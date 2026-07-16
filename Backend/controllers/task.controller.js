import db from "../database/db.js";
import {
  Task,
  TaskAssignee,
  TaskPropertyLink,
  TaskClientLink,
  TaskBailleurLink,
  TaskCommissionnaireLink,
  Property,
  Client,
  Bailleur,
  Commissionnaire,
  Person,
  User,
} from "../models/index.model.js";

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

    await t.commit();

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

    await t.commit();

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
    await task.destroy();
    return res.status(200).json({ message: "Tâche supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
