import {
  EmployeeProfile,
  Person,
  Service,
  Poste,
  Evaluation,
  Objective,
  Skill,
  EmployeeSkill,
  Training,
  EmployeeTraining,
} from "../models/index.model.js";

const EMPLOYEE_PROFILE_INCLUDES = [
  { model: Person, as: "person" },
  { model: Service, as: "service" },
  { model: Poste, as: "poste" },
];

// BACK-G22 — noyau EmployeeProfile jamais exposé via API jusqu'ici
// (BACK-G04 n'avait livré que le modèle). Prérequis pour rattacher
// évaluations/objectifs/compétences/formations à une vraie ressource.
export const getAllEmployeeProfiles = async (req, res, next) => {
  try {
    const profiles = await EmployeeProfile.findAll({
      include: EMPLOYEE_PROFILE_INCLUDES,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: profiles.length, data: profiles });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getSingleEmployeeProfile = async (req, res, next) => {
  try {
    const profile = await EmployeeProfile.findByPk(req.params.id, {
      include: EMPLOYEE_PROFILE_INCLUDES,
    });
    if (!profile) {
      return res.status(404).json({ message: "Profil RH non trouvé" });
    }
    return res.status(200).json({ data: profile });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createEmployeeProfile = async (req, res, next) => {
  try {
    const { idPerson, fullName, phone, email, idService, idPoste, idResponsable, contractType, startDate } =
      req.body;

    if (!idService) {
      return res.status(400).json({ message: "idService est requis." });
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
          message: "idPerson ou fullName est requis pour créer un profil RH.",
        });
      }
      person = await Person.create({ fullName, phone, email });
    }

    const profile = await EmployeeProfile.create({
      idPerson: person.idPerson,
      idService,
      idPoste: idPoste || null,
      idResponsable: idResponsable || null,
      contractType: contractType || null,
      startDate: startDate || null,
    });

    const created = await EmployeeProfile.findByPk(profile.idEmployeeProfile, {
      include: EMPLOYEE_PROFILE_INCLUDES,
    });
    return res.status(201).json({ message: "Profil RH créé avec succès", data: created });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const EMPLOYEE_PROFILE_FIELDS = [
  "idService",
  "idPoste",
  "idResponsable",
  "contractType",
  "startDate",
  "status",
];

export const updateEmployeeProfile = async (req, res, next) => {
  try {
    const profile = await EmployeeProfile.findByPk(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: "Profil RH non trouvé" });
    }
    const updates = {};
    EMPLOYEE_PROFILE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    await profile.update(updates);
    const updated = await EmployeeProfile.findByPk(profile.idEmployeeProfile, {
      include: EMPLOYEE_PROFILE_INCLUDES,
    });
    return res.status(200).json({ message: "Profil RH mis à jour", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// --- Évaluations ---

export const getEvaluationsForEmployee = async (req, res, next) => {
  try {
    const evaluations = await Evaluation.findAll({
      where: { idEmployeeProfile: req.params.id },
      order: [["evaluatedAt", "DESC"]],
    });
    return res.status(200).json({ nombre: evaluations.length, data: evaluations });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createEvaluation = async (req, res, next) => {
  try {
    const { period, score, comments, evaluatedAt } = req.body;
    if (!period) {
      return res.status(400).json({ message: "period est requis (ex. \"2026-Q2\")." });
    }
    const profile = await EmployeeProfile.findByPk(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: "Profil RH non trouvé" });
    }
    const evaluation = await Evaluation.create({
      idEmployeeProfile: profile.idEmployeeProfile,
      evaluatorUserId: req.user.idUser,
      period,
      score: score ?? null,
      comments: comments || null,
      evaluatedAt: evaluatedAt || new Date(),
    });
    return res.status(201).json({ message: "Évaluation créée avec succès", data: evaluation });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// --- Objectifs ---

export const getObjectivesForEmployee = async (req, res, next) => {
  try {
    const objectives = await Objective.findAll({
      where: { idEmployeeProfile: req.params.id },
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: objectives.length, data: objectives });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createObjective = async (req, res, next) => {
  try {
    const { title, description, dueDate } = req.body;
    if (!title) {
      return res.status(400).json({ message: "title est requis." });
    }
    const profile = await EmployeeProfile.findByPk(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: "Profil RH non trouvé" });
    }
    const objective = await Objective.create({
      idEmployeeProfile: profile.idEmployeeProfile,
      title,
      description: description || null,
      dueDate: dueDate || null,
      createdBy: req.user.idUser,
    });
    return res.status(201).json({ message: "Objectif créé avec succès", data: objective });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateObjectiveStatus = async (req, res, next) => {
  try {
    const { statut } = req.body;
    if (!["EN_COURS", "ATTEINT", "NON_ATTEINT"].includes(statut)) {
      return res.status(400).json({ message: "statut invalide." });
    }
    const objective = await Objective.findByPk(req.params.objectiveId);
    if (!objective) {
      return res.status(404).json({ message: "Objectif non trouvé" });
    }
    await objective.update({ statut });
    return res.status(200).json({ message: "Objectif mis à jour", data: objective });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// --- Compétences ---

export const getAllSkills = async (req, res, next) => {
  try {
    const skills = await Skill.findAll({ order: [["name", "ASC"]] });
    return res.status(200).json({ nombre: skills.length, data: skills });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createSkill = async (req, res, next) => {
  try {
    const { name, category } = req.body;
    if (!name) {
      return res.status(400).json({ message: "name est requis." });
    }
    const skill = await Skill.create({ name, category: category || null });
    return res.status(201).json({ message: "Compétence créée avec succès", data: skill });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const addEmployeeSkill = async (req, res, next) => {
  try {
    const { idSkill, niveau } = req.body;
    if (!idSkill) {
      return res.status(400).json({ message: "idSkill est requis." });
    }
    const profile = await EmployeeProfile.findByPk(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: "Profil RH non trouvé" });
    }
    const [employeeSkill] = await EmployeeSkill.findOrCreate({
      where: { idEmployeeProfile: profile.idEmployeeProfile, idSkill },
      defaults: { niveau: niveau || "DEBUTANT" },
    });
    if (niveau && employeeSkill.niveau !== niveau) {
      await employeeSkill.update({ niveau });
    }
    const withSkill = await EmployeeSkill.findByPk(employeeSkill.idEmployeeSkill, {
      include: [{ model: Skill, as: "skill" }],
    });
    return res.status(201).json({ message: "Compétence associée avec succès", data: withSkill });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const removeEmployeeSkill = async (req, res, next) => {
  try {
    const employeeSkill = await EmployeeSkill.findByPk(req.params.employeeSkillId);
    if (!employeeSkill) {
      return res.status(404).json({ message: "Association compétence non trouvée" });
    }
    await employeeSkill.destroy();
    return res.status(200).json({ message: "Compétence retirée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// --- Formations ---

export const getAllTrainings = async (req, res, next) => {
  try {
    const trainings = await Training.findAll({ order: [["title", "ASC"]] });
    return res.status(200).json({ nombre: trainings.length, data: trainings });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createTraining = async (req, res, next) => {
  try {
    const { title, provider, description } = req.body;
    if (!title) {
      return res.status(400).json({ message: "title est requis." });
    }
    const training = await Training.create({
      title,
      provider: provider || null,
      description: description || null,
    });
    return res.status(201).json({ message: "Formation créée avec succès", data: training });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const addEmployeeTraining = async (req, res, next) => {
  try {
    const { idTraining, startDate, endDate } = req.body;
    if (!idTraining) {
      return res.status(400).json({ message: "idTraining est requis." });
    }
    const profile = await EmployeeProfile.findByPk(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: "Profil RH non trouvé" });
    }
    const employeeTraining = await EmployeeTraining.create({
      idEmployeeProfile: profile.idEmployeeProfile,
      idTraining,
      startDate: startDate || null,
      endDate: endDate || null,
    });
    const withTraining = await EmployeeTraining.findByPk(employeeTraining.idEmployeeTraining, {
      include: [{ model: Training, as: "training" }],
    });
    return res.status(201).json({ message: "Formation assignée avec succès", data: withTraining });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateEmployeeTrainingStatus = async (req, res, next) => {
  try {
    const { statut } = req.body;
    if (!["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"].includes(statut)) {
      return res.status(400).json({ message: "statut invalide." });
    }
    const employeeTraining = await EmployeeTraining.findByPk(req.params.employeeTrainingId);
    if (!employeeTraining) {
      return res.status(404).json({ message: "Formation assignée non trouvée" });
    }
    await employeeTraining.update({ statut });
    return res.status(200).json({ message: "Formation mise à jour", data: employeeTraining });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
