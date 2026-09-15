import { Op } from "sequelize";
import db from "../database/db.js";
import { Bailleur, Person, Property } from "../models/index.model.js";
import { PROPERTY_INCLUDES } from "./property.controller.js";
import { serializeProperties } from "../utils/serializers/property.serializer.js";
import { compressImageInPlace } from "../utils/imageCompression.js";
import { deleteFile } from "../utils/deletefile.js";
import { checkEmail, normalizePhone } from "../utils/contactValidation.js";
import {
  serializeBailleur,
  serializeBailleurs,
} from "../utils/serializers/bailleur.serializer.js";
import { recordTimelineEvent } from "../shared/timeline.js";
import { resolveIdentityDocument } from "../utils/identityDocuments.js";

// Pièce d'identité annexée au bailleur. Servie en flux depuis le dossier
// privé, jamais mise en cache (donnée personnelle, souvent consultée sur un
// téléphone partagé).
export const getBailleurIdentityDocument = async (req, res, next) => {
  try {
    const bailleur = await Bailleur.findByPk(req.params.id, {
      include: [{ model: Person, as: "person" }],
    });
    const storedPath = bailleur?.person?.idDocumentPath;
    const absolute = storedPath ? resolveIdentityDocument(storedPath) : null;
    if (!absolute) {
      return res.status(404).json({ message: "Aucune pièce d'identité pour ce bailleur." });
    }

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", "inline");
    res.type(bailleur.person.idDocumentMimeType || "application/octet-stream");
    return res.sendFile(absolute, (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ message: "Le fichier de la pièce d'identité est introuvable." });
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const BAILLEUR_PRIORITES = ["VIP", "PREMIUM", "STANDARD", "INACTIF"];
const BAILLEUR_TYPES = ["PROPRIETAIRE", "MANDATAIRE", "GERANT", "SOCIETE"];

// Nombre de biens à l'actif du bailleur, calculé en SQL (une seule requête
// pour toute la liste, pas un COUNT par carte).
const PROPERTIES_COUNT_ATTRIBUTE = [
  db.literal(
    "(SELECT COUNT(*) FROM properties AS p WHERE p.idBailleur = bailleurs.idBailleur AND p.deletedAt IS NULL)"
  ),
  "propertiesCount",
];

// Ordre demandé par l'agence : VIP, PREMIUM, STANDARD, INACTIF, puis
// alphabétique à l'intérieur de chaque profil.
const PRIORITE_ORDER = db.literal("FIELD(`bailleurs`.`priorite`, 'VIP', 'PREMIUM', 'STANDARD', 'INACTIF')");

export const getBailleurProperties = async (req, res, next) => {
  try {
    const bailleur = await Bailleur.findByPk(req.params.id, { attributes: ["idBailleur"] });
    if (!bailleur) return res.status(404).json({ message: "Bailleur non trouvé" });

    const properties = await Property.findAll({
      where: { idBailleur: bailleur.idBailleur },
      include: PROPERTY_INCLUDES,
      order: [["createdAt", "DESC"]],
    });
    const data = await serializeProperties(properties, req.user);
    return res.status(200).json({ nombre: data.length, data });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const uploadBailleurPhoto = async (req, res, next) => {
  try {
    const bailleur = await Bailleur.findByPk(req.params.id);
    if (!bailleur) {
      await deleteFile(req.file?.path);
      return res.status(404).json({ message: "Bailleur non trouvé" });
    }
    if (!req.file) return res.status(400).json({ message: "Aucune photo fournie." });

    await compressImageInPlace(req.file.path);
    const previous = bailleur.photo;
    const photo = req.file.path.split("\\").join("/");
    await bailleur.update({ photo });
    if (previous && previous !== photo) await deleteFile(previous);

    return res.status(200).json({ message: "Photo mise à jour", data: { photo } });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getAllBailleurs = async (req, res, next) => {
  try {
    // GOAL 6 — recherche directe par numéro de dossier.
    const where = req.query.dossierNumber
      ? { dossierNumber: { [Op.like]: `%${req.query.dossierNumber}%` } }
      : {};
    if (BAILLEUR_PRIORITES.includes(req.query.priorite)) where.priorite = req.query.priorite;

    const bailleurs = await Bailleur.findAll({
      where,
      attributes: { include: [PROPERTIES_COUNT_ATTRIBUTE] },
      include: [{ model: Person, as: "person" }],
      order: [
        [PRIORITE_ORDER, "ASC"],
        [{ model: Person, as: "person" }, "fullName", "ASC"],
      ],
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
    const bailleur = await Bailleur.findByPk(id, {
      attributes: { include: [PROPERTIES_COUNT_ATTRIBUTE] },
      include: [{ model: Person, as: "person" }],
    });
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

    // GOAL 6 — même principe que Client (voir client.controller.js).
    await bailleur.update({
      dossierNumber: `BAI-${new Date().getFullYear()}-${String(bailleur.idBailleur).padStart(6, "0")}`,
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

    // Profil et statut du responsable, validés contre les listes fermées.
    if (req.body.priorite !== undefined) {
      if (!BAILLEUR_PRIORITES.includes(req.body.priorite)) {
        return res.status(400).json({ message: "Priorité invalide (VIP, PREMIUM, STANDARD ou INACTIF)." });
      }
      donneesAMettreAJour.priorite = req.body.priorite;
    }
    if (req.body.type !== undefined) {
      if (!BAILLEUR_TYPES.includes(req.body.type)) {
        return res.status(400).json({ message: "Statut du responsable invalide." });
      }
      donneesAMettreAJour.type = req.body.type;
    }

    // Identité (portée par la Person) : modifiable depuis le profil, avec
    // les mêmes contrôles que les formulaires publics.
    const personUpdates = {};
    if (req.body.fullName !== undefined) {
      const fullName = String(req.body.fullName).trim();
      if (!fullName) return res.status(400).json({ message: "Le nom du bailleur est requis." });
      personUpdates.fullName = fullName;
    }
    if (req.body.phone !== undefined) {
      if (!String(req.body.phone ?? "").trim()) {
        personUpdates.phone = null;
      } else {
        const phone = normalizePhone(req.body.phone);
        if (!phone) return res.status(400).json({ message: "Le numéro de téléphone n'est pas valide." });
        personUpdates.phone = phone;
      }
    }
    if (req.body.email !== undefined) {
      if (!String(req.body.email ?? "").trim()) {
        personUpdates.email = null;
      } else {
        const emailCheck = await checkEmail(req.body.email);
        if (!emailCheck.ok) return res.status(400).json({ message: emailCheck.reason });
        personUpdates.email = emailCheck.email;
      }
    }
    if (req.body.idNumber !== undefined) {
      personUpdates.idNumber = String(req.body.idNumber ?? "").trim() || null;
    }

    const previousStatutRelation = bailleur.statutRelation;
    const previousPriorite = bailleur.priorite;
    await bailleur.update(donneesAMettreAJour);
    if (Object.keys(personUpdates).length) {
      await Person.update(personUpdates, { where: { idPerson: bailleur.idPerson } });
    }

    if (donneesAMettreAJour.priorite && donneesAMettreAJour.priorite !== previousPriorite) {
      await recordTimelineEvent({
        entityType: "BAILLEUR",
        entityId: bailleur.idBailleur,
        eventType: "PRIORITE_CHANGED",
        title: `Profil : ${previousPriorite} → ${donneesAMettreAJour.priorite}`,
        actorUserId: req.user.idUser,
      });
    }

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

    const updated = await Bailleur.findByPk(id, {
      attributes: { include: [PROPERTIES_COUNT_ATTRIBUTE] },
      include: [{ model: Person, as: "person" }],
    });
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
