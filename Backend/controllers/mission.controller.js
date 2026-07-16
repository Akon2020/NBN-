import { Mission, Commissionnaire, Person, Property, Client } from "../models/index.model.js";
import { createArchiveHandlers } from "../utils/archivable.js";

const MISSION_INCLUDES = [
  { model: Commissionnaire, as: "commissionnaire", include: [{ model: Person, as: "person" }] },
  { model: Property },
  { model: Client },
];

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
