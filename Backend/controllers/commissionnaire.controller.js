import {
  Commissionnaire,
  CommissionnaireIncident,
  Person,
  User,
  Client,
} from "../models/index.model.js";
import {
  applyEvolutionGrid,
  clampSubScore,
  getClassement,
} from "../utils/commissionnaireScoring.js";
import { revokeAllUserSessions } from "../utils/session.utils.js";
import { invalidateSecurityVersion } from "../utils/securityVersionCache.js";
import { eventBus } from "../shared/eventBus.js";
import { recordTimelineEvent } from "../shared/timeline.js";

// BACK-G17 — n'émet l'alerte que sur la transition réelle vers
// OBSERVATION (jamais à chaque recalcul de score qui laisse le statut
// inchangé), pour ne pas spammer une alerte identique en boucle.
const emitScoreLowIfNewlyObserved = (commissionnaire, previousStatut) => {
  if (previousStatut !== "OBSERVATION" && commissionnaire.statut === "OBSERVATION") {
    eventBus.emit("commissionnaire:score_low", { commissionnaire });
  }
};

const COMMISSIONNAIRE_INCLUDES = [
  { model: Person, as: "person" },
  { model: CommissionnaireIncident, as: "incidents" },
];

const withClassement = (commissionnaire) => {
  const plain =
    typeof commissionnaire.toJSON === "function" ? commissionnaire.toJSON() : { ...commissionnaire };
  plain.classement = getClassement(Number(plain.scoreGlobal));
  return plain;
};

// MOBILE-G04 — le Mobile a besoin de résoudre "ma propre fiche
// commissionnaire" à partir du compte connecté, sans avoir à récupérer
// (ni filtrer côté client) la liste complète de tous les commissionnaires.
export const getMyCommissionnaireProfile = async (req, res, next) => {
  try {
    const person = await Person.findOne({ where: { idUser: req.user.idUser } });
    if (!person) {
      return res.status(404).json({ message: "Aucune fiche commissionnaire liée à ce compte." });
    }

    const commissionnaire = await Commissionnaire.findOne({
      where: { idPerson: person.idPerson },
      include: [{ model: Person, as: "person" }],
    });
    if (!commissionnaire) {
      return res.status(404).json({ message: "Aucune fiche commissionnaire liée à ce compte." });
    }

    return res.status(200).json(withClassement(commissionnaire));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getAllCommissionnaires = async (req, res, next) => {
  try {
    const commissionnaires = await Commissionnaire.findAll({
      include: [{ model: Person, as: "person" }],
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({
      nombre: commissionnaires.length,
      data: commissionnaires.map(withClassement),
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getSingleCommissionnaire = async (req, res, next) => {
  try {
    const { id } = req.params;
    const commissionnaire = await Commissionnaire.findByPk(id, {
      include: COMMISSIONNAIRE_INCLUDES,
    });
    if (!commissionnaire) {
      return res.status(404).json({ message: "Commissionnaire non trouvé" });
    }
    return res.status(200).json(withClassement(commissionnaire));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 4 — renforce le lien Client↔Commissionnaire : la fiche
// commissionnaire doit pouvoir montrer les clients qu'il a effectivement
// apportés (Client.sourceCommissionnaireCode === ce code), pas seulement
// l'inverse (déjà visible côté fiche client).
export const getCommissionnaireClients = async (req, res, next) => {
  try {
    const { id } = req.params;
    const commissionnaire = await Commissionnaire.findByPk(id);
    if (!commissionnaire) {
      return res.status(404).json({ message: "Commissionnaire non trouvé" });
    }

    const clients = await Client.findAll({
      where: { sourceCommissionnaireCode: commissionnaire.code, archivedAt: null },
      include: [{ model: Person, as: "person" }],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({ nombre: clients.length, data: clients });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createCommissionnaire = async (req, res, next) => {
  try {
    const { idPerson, fullName, phone, email, code, zone, dateDebutActivite } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Le code commissionnaire est requis." });
    }

    let person;
    if (idPerson) {
      person = await Person.findByPk(idPerson);
      if (!person) {
        return res.status(404).json({ message: "Personne non trouvée." });
      }
    } else {
      if (!fullName) {
        return res.status(400).json({
          message: "idPerson ou fullName est requis pour créer un commissionnaire.",
        });
      }
      person = await Person.create({ fullName, phone, email });
    }

    const commissionnaire = await Commissionnaire.create({
      idPerson: person.idPerson,
      code,
      zone,
      dateDebutActivite,
      createdBy: req.user.idUser,
    });

    const created = await Commissionnaire.findByPk(commissionnaire.idCommissionnaire, {
      include: [{ model: Person, as: "person" }],
    });

    await recordTimelineEvent({
      entityType: "COMMISSIONNAIRE",
      entityId: commissionnaire.idCommissionnaire,
      eventType: "CREATED",
      title: "Commissionnaire créé",
      description: `${person.fullName} — ${code}`,
      actorUserId: req.user.idUser,
    });

    return res.status(201).json({
      message: "Commissionnaire créé avec succès",
      data: withClassement(created),
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Ce code commissionnaire est déjà utilisé." });
    }
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateCommissionnaire = async (req, res, next) => {
  try {
    const { id } = req.params;
    const commissionnaire = await Commissionnaire.findByPk(id, {
      include: [{ model: Person, as: "person" }],
    });
    if (!commissionnaire) {
      return res.status(404).json({ message: "Commissionnaire non trouvé" });
    }

    const champsModifiables = ["zone", "dateDebutActivite", "statut"];
    const donneesAMettreAJour = {};
    champsModifiables.forEach((champ) => {
      if (req.body[champ] !== undefined) {
        donneesAMettreAJour[champ] = req.body[champ];
      }
    });

    const statutSuspensif = ["SUSPENDU", "EXCLU"];
    const passageEnSuspension =
      donneesAMettreAJour.statut &&
      statutSuspensif.includes(donneesAMettreAJour.statut) &&
      !statutSuspensif.includes(commissionnaire.statut);

    const previousStatut = commissionnaire.statut;
    await commissionnaire.update(donneesAMettreAJour);

    if (donneesAMettreAJour.statut && donneesAMettreAJour.statut !== previousStatut) {
      await recordTimelineEvent({
        entityType: "COMMISSIONNAIRE",
        entityId: commissionnaire.idCommissionnaire,
        eventType: "STATUT_CHANGED",
        title: `Statut : ${previousStatut} → ${donneesAMettreAJour.statut}`,
        actorUserId: req.user.idUser,
      });
    }

    // BACK-G11 — suspension/exclusion d'un commissionnaire révoque
    // immédiatement toute session active, exactement comme pour un User
    // désactivé (CLAUDE.md §5) — seulement si la Person liée a un compte
    // de connexion (un commissionnaire peut ne jamais s'être connecté).
    if (passageEnSuspension && commissionnaire.person?.idUser) {
      const linkedUser = await User.findByPk(commissionnaire.person.idUser);
      if (linkedUser) {
        await linkedUser.update({ securityVersion: linkedUser.securityVersion + 1 });
        await revokeAllUserSessions(linkedUser.idUser, "account_suspended");
        invalidateSecurityVersion(linkedUser.idUser);
      }
    }

    const updated = await Commissionnaire.findByPk(id, {
      include: [{ model: Person, as: "person" }],
    });
    return res.status(200).json({ message: "Commissionnaire mis à jour", data: withClassement(updated) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// Évaluation manuelle des 4 sous-scores (CDC §7 : le calcul automatique à
// partir des transactions/commissions dépend du module Trésorerie,
// Milestone 4, pas encore construit — en attendant, un utilisateur autorisé
// saisit chaque sous-score /25). La grille d'évolution est réappliquée à
// chaque évaluation.
export const updateCommissionnaireScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const commissionnaire = await Commissionnaire.findByPk(id);
    if (!commissionnaire) {
      return res.status(404).json({ message: "Commissionnaire non trouvé" });
    }

    const dimensions = ["scorePerformance", "scoreQualite", "scoreDiscipline", "scoreEngagement"];
    dimensions.forEach((dimension) => {
      if (req.body[dimension] !== undefined) {
        commissionnaire[dimension] = clampSubScore(req.body[dimension]);
      }
    });

    const previousStatut = commissionnaire.statut;
    applyEvolutionGrid(commissionnaire);
    await commissionnaire.save();
    emitScoreLowIfNewlyObserved(commissionnaire, previousStatut);

    const updated = await Commissionnaire.findByPk(id, {
      include: [{ model: Person, as: "person" }],
    });
    return res.status(200).json({ message: "Score mis à jour", data: withClassement(updated) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const deleteCommissionnaire = async (req, res, next) => {
  try {
    const { id } = req.params;
    const commissionnaire = await Commissionnaire.findByPk(id);
    if (!commissionnaire) {
      return res.status(404).json({ message: "Commissionnaire non trouvé" });
    }
    await commissionnaire.destroy();
    return res.status(200).json({ message: "Commissionnaire supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// CDC §7 — système d'incidents (retard, données incomplètes, non-respect
// des règles) impactant le score discipline, réévalué automatiquement
// après chaque incident.
export const createIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, gravite, description, impactDiscipline } = req.body;

    if (!type) {
      return res.status(400).json({ message: "Le type d'incident est requis." });
    }

    const commissionnaire = await Commissionnaire.findByPk(id);
    if (!commissionnaire) {
      return res.status(404).json({ message: "Commissionnaire non trouvé" });
    }

    const incident = await CommissionnaireIncident.create({
      idCommissionnaire: id,
      type,
      gravite,
      description,
      impactDiscipline: impactDiscipline ?? 0,
      createdBy: req.user.idUser,
    });

    commissionnaire.scoreDiscipline = clampSubScore(
      Number(commissionnaire.scoreDiscipline) - Number(impactDiscipline ?? 0)
    );
    const previousStatut = commissionnaire.statut;
    applyEvolutionGrid(commissionnaire);
    await commissionnaire.save();
    emitScoreLowIfNewlyObserved(commissionnaire, previousStatut);

    await recordTimelineEvent({
      entityType: "COMMISSIONNAIRE",
      entityId: commissionnaire.idCommissionnaire,
      eventType: "INCIDENT",
      title: `Incident : ${type}`,
      description: description || null,
      metadata: { gravite: gravite || null, impactDiscipline: impactDiscipline ?? 0 },
      actorUserId: req.user.idUser,
    });

    return res.status(201).json({
      message: "Incident enregistré",
      data: incident,
      commissionnaire: withClassement(commissionnaire),
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
