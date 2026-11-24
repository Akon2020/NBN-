import { Op } from "sequelize";
import {
  Client,
  Commission,
  Commissionnaire,
  Person,
  Property,
  PropertyImage,
  Task,
  TaskAssignee,
  TaskComment,
  TaskCommissionnaireLink,
  User,
} from "../models/index.model.js";
import { serializeOwnCommissionnaire } from "../utils/serializers/commissionnaire.serializer.js";
import { recordTimelineEvent } from "../shared/timeline.js";
import { createNotification } from "../services/notification.service.js";

// Espace du commissionnaire ou du collecteur (P1.2). Règle contextuelle :
// chaque route ne renvoie que ce qui concerne la fiche liée au compte
// connecté (biens portant son code, clients qu'il a apportés, tâches qui
// lui sont assignées, ses commissions). Jamais sa notation, jamais les
// autres commissionnaires, jamais l'identité d'un bailleur.

const CLOSED_PIPELINE = ["CONCLU", "PERDU"];
const AGENT_TASK_STATUTS = ["A_FAIRE", "EN_COURS", "TERMINEE"];

export const requireFieldAgent = async (req, res, next) => {
  try {
    const person = await Person.findOne({ where: { idUser: req.user.idUser } });
    const agent = person
      ? await Commissionnaire.findOne({ where: { idPerson: person.idPerson }, include: [{ model: Person, as: "person" }] })
      : null;
    if (!agent) return res.status(404).json({ message: "Aucune fiche commissionnaire liée à ce compte." });
    req.fieldAgent = agent;
    return next();
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    return next(error);
  }
};

const ownPropertiesWhere = (code) => ({ [Op.or]: [{ codeCommissionnaire: code }, { codeCollecteur: code }] });

// Tâches assignées au compte, ou liées à la fiche terrain.
const ownTaskIds = async (agent, userId) => {
  const [assigned, linked] = await Promise.all([
    TaskAssignee.findAll({ where: { idUser: userId }, attributes: ["idTask"] }),
    TaskCommissionnaireLink.findAll({ where: { idCommissionnaire: agent.idCommissionnaire }, attributes: ["idTask"] }),
  ]);
  return [...new Set([...assigned, ...linked].map((row) => String(row.idTask)))];
};

const sumByCurrency = (rows) =>
  rows.reduce((totals, row) => {
    totals[row.currencyCode] = Math.round(((totals[row.currencyCode] ?? 0) + Number(row.montantCommission)) * 100) / 100;
    return totals;
  }, {});

export const getFieldAgentOverview = async (req, res, next) => {
  try {
    const agent = req.fieldAgent;
    const [propertiesCount, clients, commissions, taskIds] = await Promise.all([
      Property.count({ where: ownPropertiesWhere(agent.code) }),
      Client.findAll({ where: { sourceCommissionnaireCode: agent.code }, attributes: ["statutPipeline"] }),
      Commission.findAll({
        where: { idCommissionnaire: agent.idCommissionnaire, statut: { [Op.ne]: "ANNULEE" } },
        attributes: ["statut", "montantCommission", "currencyCode"],
      }),
      ownTaskIds(agent, req.user.idUser),
    ]);
    const openTasks = taskIds.length
      ? await Task.count({ where: { idTask: taskIds, statut: { [Op.ne]: "TERMINEE" } } })
      : 0;

    return res.status(200).json({
      data: {
        fiche: serializeOwnCommissionnaire(agent),
        stats: {
          biensEnregistres: propertiesCount,
          clientsTraites: clients.filter((c) => CLOSED_PIPELINE.includes(c.statutPipeline)).length,
          clientsEnCours: clients.filter((c) => !CLOSED_PIPELINE.includes(c.statutPipeline)).length,
          tachesOuvertes: openTasks,
          // En attente (calculée) → Prête (due) → Payée.
          commissions: {
            enAttente: sumByCurrency(commissions.filter((c) => c.statut === "CALCULEE")),
            pretes: sumByCurrency(commissions.filter((c) => c.statut === "DUE")),
            payees: sumByCurrency(commissions.filter((c) => c.statut === "PAYEE")),
          },
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getFieldAgentProperties = async (req, res, next) => {
  try {
    const properties = await Property.findAll({
      where: ownPropertiesWhere(req.fieldAgent.code),
      attributes: ["idProperty", "category", "propertyType", "commune", "quartier", "avenue", "price", "statut", "createdAt"],
      include: [{ model: PropertyImage, as: "images", attributes: ["image", "order"], separate: true, order: [["order", "ASC"]], limit: 1 }],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    return res.status(200).json({ nombre: properties.length, data: properties });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getFieldAgentClients = async (req, res, next) => {
  try {
    const clients = await Client.findAll({
      where: { sourceCommissionnaireCode: req.fieldAgent.code },
      attributes: ["idClient", "dossierNumber", "statutPipeline", "createdAt"],
      include: [{ model: Person, as: "person", attributes: ["fullName"] }],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    return res.status(200).json({ nombre: clients.length, data: clients });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const TASK_VIEW_ATTRIBUTES = ["idTask", "title", "description", "statut", "priorite", "dateEcheance", "createdAt", "updatedAt"];

export const getFieldAgentTasks = async (req, res, next) => {
  try {
    const ids = await ownTaskIds(req.fieldAgent, req.user.idUser);
    const tasks = ids.length
      ? await Task.findAll({ where: { idTask: ids }, attributes: TASK_VIEW_ATTRIBUTES, order: [["createdAt", "DESC"]] })
      : [];
    return res.status(200).json({ nombre: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const findOwnTask = async (req) => {
  const ids = await ownTaskIds(req.fieldAgent, req.user.idUser);
  return ids.includes(String(req.params.id)) ? Task.findByPk(req.params.id) : null;
};

export const updateFieldAgentTaskStatus = async (req, res, next) => {
  try {
    const { statut } = req.body ?? {};
    if (!AGENT_TASK_STATUTS.includes(statut)) {
      return res.status(400).json({ message: "Statut attendu : à faire, en cours ou terminée." });
    }
    const task = await findOwnTask(req);
    if (!task) return res.status(404).json({ message: "Tâche introuvable." });
    const previous = task.statut;
    await task.update({ statut });
    await recordTimelineEvent({
      entityType: "TASK",
      entityId: task.idTask,
      eventType: "STATUS_CHANGED",
      title: "Statut modifié par le commissionnaire",
      description: `${previous} → ${statut}`,
      actorUserId: req.user.idUser,
    });
    return res.status(200).json({ data: task });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

/**
 * « Déclarer la tâche terminée (client conclu) » : la tâche passe en
 * révision et l'agence est prévenue pour valider. La commission n'est
 * calculée qu'après cette validation, par l'agence (Commissions).
 */
export const declareFieldAgentConclusion = async (req, res, next) => {
  try {
    const note = String(req.body?.note ?? "").trim().slice(0, 1000);
    const task = await findOwnTask(req);
    if (!task) return res.status(404).json({ message: "Tâche introuvable." });
    if (task.statut === "TERMINEE") return res.status(409).json({ message: "Cette tâche est déjà terminée." });

    await task.update({ statut: "EN_REVISION" });
    await TaskComment.create({
      idTask: task.idTask,
      authorId: req.user.idUser,
      content: `Conclusion déclarée par ${req.fieldAgent.person?.fullName} (${req.fieldAgent.code})${note ? ` : ${note}` : ""}`,
    });
    await recordTimelineEvent({
      entityType: "TASK",
      entityId: task.idTask,
      eventType: "CONCLUSION_DECLARED",
      title: "Conclusion déclarée par le commissionnaire",
      description: note || null,
      actorUserId: req.user.idUser,
    });

    // Créateur de la tâche et administrateurs : à valider.
    const recipients = await User.findAll({
      where: {
        status: "ACTIVE",
        [Op.or]: [{ idUser: task.createdBy ?? 0 }, { role: "admin" }],
      },
      attributes: ["idUser"],
    });
    for (const user of recipients) {
      await createNotification({
        idUser: user.idUser,
        type: "task:conclusion_declared",
        title: `Conclusion à valider : ${task.title}`,
        message: `${req.fieldAgent.person?.fullName} (${req.fieldAgent.code}) déclare la tâche conclue.${note ? ` ${note}` : ""}`,
        relatedEntityType: "Task",
        relatedEntityId: task.idTask,
      });
    }
    return res.status(200).json({ message: "Conclusion transmise à l'agence pour validation.", data: task });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getFieldAgentCommissions = async (req, res, next) => {
  try {
    const commissions = await Commission.findAll({
      where: { idCommissionnaire: req.fieldAgent.idCommissionnaire },
      attributes: ["idCommission", "statut", "montantCommission", "currencyCode", "createdAt", "updatedAt"],
      include: [{ model: Client, as: "client", attributes: ["dossierNumber"] }],
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: commissions.length, data: commissions });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
