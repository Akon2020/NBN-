import { Op } from "sequelize";
import {
  Property,
  Client,
  Bailleur,
  Commissionnaire,
  Task,
  Person,
} from "../models/index.model.js";
import { PROPERTY_INCLUDES } from "./property.controller.js";
import { serializeProperties } from "../utils/serializers/property.serializer.js";
import { serializeBailleurs } from "../utils/serializers/bailleur.serializer.js";
import { hasPermission } from "../utils/rbac.js";

const LIMIT = 6;

// GOAL 18 — recherche transverse : chaque type d'entité n'est inclus dans
// les résultats que si l'appelant a la permission de lecture correspondante
// (CLAUDE.md §5 — jamais une nouvelle permission "search" fourre-tout qui
// contournerait le RBAC déjà en place par domaine). Les biens n'ont jamais
// été soumis à une permission de lecture (property.route.js), cohérent
// avec le reste du système — inclus systématiquement.
export const globalSearch = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) {
      return res.status(400).json({ message: "q doit contenir au moins 2 caractères." });
    }
    const like = { [Op.like]: `%${q}%` };

    const [canReadClients, canReadBailleurs, canReadCommissionnaires, canReadTasks] =
      await Promise.all([
        hasPermission(req.user, "clients:read"),
        hasPermission(req.user, "bailleurs:read"),
        hasPermission(req.user, "commissionnaires:read"),
        hasPermission(req.user, "tasks:read"),
      ]);

    const properties = await Property.findAll({
      where: {
        archivedAt: null,
        [Op.or]: [{ quartier: like }, { avenue: like }, { description: like }],
      },
      include: PROPERTY_INCLUDES,
      limit: LIMIT,
    });

    const [clients, bailleurs, commissionnaires, tasks] = await Promise.all([
      canReadClients
        ? Client.findAll({
            where: { archivedAt: null },
            include: [{ model: Person, as: "person", where: { fullName: like }, required: true }],
            limit: LIMIT,
          })
        : [],
      canReadBailleurs
        ? Bailleur.findAll({
            include: [{ model: Person, as: "person", where: { fullName: like }, required: true }],
            limit: LIMIT,
          })
        : [],
      canReadCommissionnaires
        ? Commissionnaire.findAll({
            where: { [Op.or]: [{ code: like }, { "$person.fullName$": like }] },
            include: [{ model: Person, as: "person", required: true }],
            limit: LIMIT,
          })
        : [],
      canReadTasks
        ? Task.findAll({ where: { title: like }, limit: LIMIT })
        : [],
    ]);

    const [propertiesInfo, bailleursInfo] = await Promise.all([
      serializeProperties(properties, req.user),
      serializeBailleurs(bailleurs, req.user),
    ]);

    return res.status(200).json({
      query: q,
      results: {
        properties: propertiesInfo,
        clients,
        bailleurs: bailleursInfo,
        commissionnaires,
        tasks,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
