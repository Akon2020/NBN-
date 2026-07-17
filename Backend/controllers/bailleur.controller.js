import { Bailleur, Person } from "../models/index.model.js";
import {
  serializeBailleur,
  serializeBailleurs,
} from "../utils/serializers/bailleur.serializer.js";
import { recordTimelineEvent } from "../shared/timeline.js";

export const getAllBailleurs = async (req, res, next) => {
  try {
    const bailleurs = await Bailleur.findAll({
      include: [{ model: Person, as: "person" }],
      order: [["createdAt", "DESC"]],
    });
    const data = await serializeBailleurs(bailleurs, req.user);
    return res.status(200).json({ nombre: data.length, data });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getSingleBailleur = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bailleur = await Bailleur.findByPk(id, { include: [{ model: Person, as: "person" }] });
    if (!bailleur) {
      return res.status(404).json({ message: "Bailleur non trouvé" });
    }
    const data = await serializeBailleur(bailleur, req.user);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createBailleur = async (req, res, next) => {
  try {
    const { idPerson, fullName, phone, email, type, ...bailleurFields } = req.body;

    if (!type) {
      return res.status(400).json({ message: "Le type (PROPRIETAIRE/MANDATAIRE) est requis." });
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
          message: "idPerson ou fullName est requis pour créer un bailleur.",
        });
      }
      person = await Person.create({ fullName, phone, email });
    }

    const bailleur = await Bailleur.create({
      idPerson: person.idPerson,
      type,
      ...bailleurFields,
      createdBy: req.user.idUser,
    });

    const bailleurWithPerson = await Bailleur.findByPk(bailleur.idBailleur, {
      include: [{ model: Person, as: "person" }],
    });
    const data = await serializeBailleur(bailleurWithPerson, req.user);

    await recordTimelineEvent({
      entityType: "BAILLEUR",
      entityId: bailleur.idBailleur,
      eventType: "CREATED",
      title: "Bailleur créé",
      description: person.fullName,
      actorUserId: req.user.idUser,
    });

    return res.status(201).json({
      message: "Bailleur créé avec succès",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateBailleur = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bailleur = await Bailleur.findByPk(id);
    if (!bailleur) {
      return res.status(404).json({ message: "Bailleur non trouvé" });
    }

    const champsModifiables = [
      "typeCollaboration",
      "dureeCollaboration",
      "margeAgence",
      "frequenceContactJours",
      "dernierContact",
      "prochainContact",
      "notes",
      "fiabilite",
      "restrictions",
      "exigencesFinancieres",
      "statutRelation",
      "valeurBailleur",
    ];
    const donneesAMettreAJour = {};
    champsModifiables.forEach((champ) => {
      if (req.body[champ] !== undefined) {
        donneesAMettreAJour[champ] = req.body[champ];
      }
    });

    // margeAgence est une donnée financière sensible (BACK-G03) : seul un
    // appelant ayant la permission peut la modifier, pas seulement la lire.
    if (
      donneesAMettreAJour.margeAgence !== undefined &&
      req.user.role !== "admin"
    ) {
      const { hasPermission } = await import("../utils/rbac.js");
      const allowed = await hasPermission(req.user, "bailleur:marge:read");
      if (!allowed) {
        delete donneesAMettreAJour.margeAgence;
      }
    }

    const previousStatutRelation = bailleur.statutRelation;
    await bailleur.update(donneesAMettreAJour);

    if (
      donneesAMettreAJour.statutRelation &&
      donneesAMettreAJour.statutRelation !== previousStatutRelation
    ) {
      await recordTimelineEvent({
        entityType: "BAILLEUR",
        entityId: bailleur.idBailleur,
        eventType: "STATUT_RELATION_CHANGED",
        title: `Relation : ${previousStatutRelation} → ${donneesAMettreAJour.statutRelation}`,
        actorUserId: req.user.idUser,
      });
    }

    const updated = await Bailleur.findByPk(id, { include: [{ model: Person, as: "person" }] });
    const data = await serializeBailleur(updated, req.user);
    return res.status(200).json({ message: "Bailleur mis à jour", data });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const deleteBailleur = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bailleur = await Bailleur.findByPk(id);
    if (!bailleur) {
      return res.status(404).json({ message: "Bailleur non trouvé" });
    }
    await bailleur.destroy();
    return res.status(200).json({ message: "Bailleur supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
