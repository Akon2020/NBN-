import { Op } from "sequelize";
import { TimelineEvent, User } from "../models/index.model.js";
import { hasPermission } from "../utils/rbac.js";

const ENTITY_PERMISSION = {
  PROPERTY: null, // déjà ouvert à tout utilisateur authentifié (cf. property.route.js)
  CLIENT: "clients:read",
  COMMISSIONNAIRE: "commissionnaires:read",
  BAILLEUR: "bailleurs:read",
  MISSION: "missions:read",
};

// GOAL 3 — lecture filtrable de la timeline d'une entité. Réutilise la
// permission de lecture déjà existante du domaine concerné (jamais une
// nouvelle permission dédiée à la timeline elle-même).
export const getEntityTimeline = async (req, res, next) => {
  try {
    const entityType = req.params.entityType?.toUpperCase();
    const entityId = req.params.entityId;

    if (!Object.keys(ENTITY_PERMISSION).includes(entityType)) {
      return res.status(400).json({
        message: "entityType invalide (PROPERTY, CLIENT, COMMISSIONNAIRE, BAILLEUR, MISSION).",
      });
    }

    const requiredPermission = ENTITY_PERMISSION[entityType];
    if (requiredPermission) {
      const allowed = await hasPermission(req.user, requiredPermission);
      if (!allowed) {
        return res.status(403).json({ message: "Accès refusé : permissions insuffisantes." });
      }
    }

    const { eventType, from, to } = req.query;
    const where = { entityType, entityId };
    if (eventType) where.eventType = eventType;
    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt[Op.gte] = new Date(from);
      if (to) where.occurredAt[Op.lte] = new Date(to);
    }

    const events = await TimelineEvent.findAll({
      where,
      include: [{ model: User, as: "actor", attributes: ["idUser", "fullName"] }],
      order: [["occurredAt", "DESC"]],
    });

    return res.status(200).json({ nombre: events.length, data: events });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
