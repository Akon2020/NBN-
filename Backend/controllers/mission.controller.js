import { Mission, Commissionnaire, Person, Property, Client } from "../models/index.model.js";
import { createArchiveHandlers } from "../utils/archivable.js";
import { recordTimelineEvent } from "../shared/timeline.js";
import { createNotification } from "../services/notification.service.js";
import { hasPermission } from "../utils/rbac.js";

const MISSION_INCLUDES = [
  { model: Commissionnaire, as: "commissionnaire", include: [{ model: Person, as: "person" }] },
  { model: Property },
  { model: Client },
];

// GOAL 14 — notifie le compte de connexion du commissionnaire assigné
// (s'il en a un — un commissionnaire terrain peut exister sans User,
// CLAUDE.md §4), jamais une exception silencieuse si aucun compte n'existe.
const notifyMissionCommissionnaire = async (mission, { type, title, message }) => {
  const commissionnaire = await Commissionnaire.findByPk(mission.idCommissionnaire, {
    include: [{ model: Person, as: "person" }],
  });
  const idUser = commissionnaire?.person?.idUser;
  if (!idUser) return;
  await createNotification({
    idUser,
    type,
    title,
    message,
    relatedEntityType: "Mission",
    relatedEntityId: mission.idMission,
  });
};

// BACK-G21 — missions archivées désencombrées des listes actives par
// défaut, réintégrables via `?includeArchived=true`.
export const getAllMissions = async (req, res, next) => {
  try {
    const where = req.query.includeArchived === "true" ? {} : { archivedAt: null };
    const missions = await Mission.findAll({
      where,
      include: MISSION_INCLUDES,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: missions.length, data: missions });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getMissionsByCommissionnaire = async (req, res, next) => {
  try {
    const { idCommissionnaire } = req.params;
    const missions = await Mission.findAll({
      where: { idCommissionnaire },
      include: [{ model: Property }, { model: Client }],
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: missions.length, data: missions });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 14 — détail d'une mission (absent jusqu'ici, seules les listes
// existaient).
export const getSingleMission = async (req, res, next) => {
  try {
    const mission = await Mission.findByPk(req.params.id, { include: MISSION_INCLUDES });
    if (!mission) {
      return res.status(404).json({ message: "Mission non trouvée" });
    }
    return res.status(200).json({ data: mission });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// CLAUDE.md §8 — idempotence terrain : `uuid` généré côté client Mobile dès
// la création locale. Une resoumission après coupure réseau (même uuid) ne
// doit jamais créer de doublon.
export const createMission = async (req, res, next) => {
  try {
    const { uuid, idCommissionnaire, type, idProperty, idClient, notes } = req.body;

    if (!uuid || !idCommissionnaire || !type) {
      return res
        .status(400)
        .json({ message: "uuid, idCommissionnaire et type sont requis." });
    }

    const commissionnaire = await Commissionnaire.findByPk(idCommissionnaire);
    if (!commissionnaire) {
      return res.status(404).json({ message: "Commissionnaire non trouvé" });
    }

    const [mission, created] = await Mission.findOrCreate({
      where: { uuid },
      defaults: { idCommissionnaire, type, idProperty, idClient, notes },
    });

    // Jamais journalisé sur une resoumission idempotente (même uuid) — un
    // seul événement CREATED par mission réelle, pas par tentative réseau.
    if (created) {
      await recordTimelineEvent({
        entityType: "MISSION",
        entityId: mission.idMission,
        eventType: "CREATED",
        title: `Mission soumise : ${type}`,
        description: notes || null,
        actorUserId: req.user.idUser,
      });
    }

    return res.status(created ? 201 : 200).json({
      message: created ? "Mission soumise avec succès" : "Cette mission a déjà été soumise",
      data: mission,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const transitionMission = async (req, res, next, { statut, requireMotif }) => {
  try {
    const { id } = req.params;
    // `Valider` n'envoie légitimement aucun corps de requête — express.json()
    // ne peuple `req.body` que si un Content-Type JSON est présent.
    const { motifRejet } = req.body || {};

    if (requireMotif && !motifRejet) {
      return res.status(400).json({ message: "Un motif est requis pour cette action." });
    }

    const mission = await Mission.findByPk(id);
    if (!mission) {
      return res.status(404).json({ message: "Mission non trouvée" });
    }

    await mission.update({
      statut,
      motifRejet: requireMotif ? motifRejet : mission.motifRejet,
      validatedBy: req.user.idUser,
      validatedAt: new Date(),
    });
    await mission.reload({ include: MISSION_INCLUDES });

    const missionEvent = {
      eventType: "MISSION",
      title: `Mission ${mission.type} — ${statut}`,
      description: requireMotif ? motifRejet : null,
      actorUserId: req.user.idUser,
    };
    if (mission.idProperty) {
      await recordTimelineEvent({ entityType: "PROPERTY", entityId: mission.idProperty, ...missionEvent });
    }
    if (mission.idClient) {
      await recordTimelineEvent({ entityType: "CLIENT", entityId: mission.idClient, ...missionEvent });
    }
    await recordTimelineEvent({
      entityType: "COMMISSIONNAIRE",
      entityId: mission.idCommissionnaire,
      ...missionEvent,
    });
    await recordTimelineEvent({
      entityType: "MISSION",
      entityId: mission.idMission,
      eventType: statut,
      title: `Statut : ${statut}`,
      description: requireMotif ? motifRejet : null,
      actorUserId: req.user.idUser,
    });

    // GOAL 14 — le commissionnaire assigné n'était jamais notifié d'une
    // décision sur sa mission avant cette session.
    const STATUT_MESSAGE = {
      VALIDEE: "Votre mission a été validée.",
      REJETEE: `Votre mission a été rejetée. Motif : ${motifRejet}`,
      CORRECTION_DEMANDEE: `Une correction est demandée. Motif : ${motifRejet}`,
    };
    await notifyMissionCommissionnaire(mission, {
      type: `mission:${statut.toLowerCase()}`,
      title: `Mission ${mission.type}`,
      message: STATUT_MESSAGE[statut],
    });

    return res.status(200).json({ message: "Mission mise à jour", data: mission });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// CDC §7 — écran de validation des missions terrain, trois actions.
export const validateMission = (req, res, next) =>
  transitionMission(req, res, next, { statut: "VALIDEE", requireMotif: false });

export const rejectMission = (req, res, next) =>
  transitionMission(req, res, next, { statut: "REJETEE", requireMotif: true });

export const requestMissionCorrection = (req, res, next) =>
  transitionMission(req, res, next, { statut: "CORRECTION_DEMANDEE", requireMotif: true });

// BACK-G21 — archivage métier, orthogonal au `statut` de la mission. Aucun
// endpoint de suppression n'existe pour les missions (historique terrain,
// CDC §7) — seul l'archivage s'applique ici, pas de soft delete.
export const { archiveResource: archiveMission, unarchiveResource: unarchiveMission } =
  createArchiveHandlers(Mission, "idMission", "Mission non trouvée");

// GOAL 14 — seul le commissionnaire assigné (via son propre compte) ou un
// utilisateur avec missions:validate peut déclarer l'avancement terrain —
// jamais un tiers non concerné, même avec missions:read.
export const updateMissionProgression = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { progression } = req.body;
    const numeric = Number(progression);
    if (progression === undefined || Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
      return res.status(400).json({ message: "progression doit être un nombre entre 0 et 100." });
    }

    const mission = await Mission.findByPk(id);
    if (!mission) {
      return res.status(404).json({ message: "Mission non trouvée" });
    }

    const canValidate = await hasPermission(req.user, "missions:validate");
    if (!canValidate) {
      const person = await Person.findOne({ where: { idUser: req.user.idUser } });
      const commissionnaire = person
        ? await Commissionnaire.findOne({ where: { idPerson: person.idPerson } })
        : null;
      if (!commissionnaire || commissionnaire.idCommissionnaire !== mission.idCommissionnaire) {
        return res.status(403).json({
          message: "Seul le commissionnaire assigné à cette mission peut déclarer son avancement.",
        });
      }
    }

    await mission.update({ progression: numeric });

    await recordTimelineEvent({
      entityType: "MISSION",
      entityId: mission.idMission,
      eventType: "PROGRESSION",
      title: `Avancement : ${numeric}%`,
      actorUserId: req.user.idUser,
    });

    const updated = await Mission.findByPk(id, { include: MISSION_INCLUDES });
    return res.status(200).json({ message: "Avancement mis à jour", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
