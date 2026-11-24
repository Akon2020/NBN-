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
import { getSettingValue } from "../shared/appSettings.js";
import db from "../database/db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { FRONT_URL } from "../config/env.js";
import { issueAuthToken } from "../utils/authTokens.js";
import { accessKeyEmail } from "../utils/accountEmail.templates.js";
import { queueEmail } from "../services/email.service.js";
import { valideEmail } from "../utils/user.utils.js";
import { codePrefixOfProfil, nextSequenceCode, peekSequenceCode } from "../shared/codes.js";
import { normalizePhone } from "../utils/contactValidation.js";
import {
  deleteIdentityDocument,
  resolveIdentityDocument,
  storeIdentityDocumentPair,
} from "../utils/identityDocuments.js";
import {
  commissionnaireAccess,
  serializeCommissionnaire,
  serializeOwnCommissionnaire,
} from "../utils/serializers/commissionnaire.serializer.js";

const PROFILS = ["COMMISSIONNAIRE", "COLLECTEUR"];
const ID_DOCUMENT_TYPES = ["CARTE_ELECTEUR", "CARTE_IDENTITE"];
// Actif : en activité (y compris sous observation). Inactif : suspendu ou
// exclu. Interprétation à confirmer par l'agence.
const ACTIVE_STATUTS = ["ACTIF", "OBSERVATION"];

const profilLabel = (profil) => (profil === "COLLECTEUR" ? "Collecteur" : "Commissionnaire");

// BACK-G17 - n'émet l'alerte que sur la transition réelle vers
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

// MOBILE-G04 - le Mobile a besoin de résoudre "ma propre fiche
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

    // Le commissionnaire ne voit jamais sa notation (P1.2).
    return res.status(200).json(serializeOwnCommissionnaire(commissionnaire));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const countByActivity = (commissionnaires) => {
  const stats = { total: commissionnaires.length, actifs: 0, inactifs: 0, commissionnaires: 0, collecteurs: 0 };
  for (const c of commissionnaires) {
    if (ACTIVE_STATUTS.includes(c.statut)) stats.actifs += 1;
    else stats.inactifs += 1;
    if (c.profil === "COLLECTEUR") stats.collecteurs += 1;
    else stats.commissionnaires += 1;
  }
  return stats;
};

export const getCommissionnaireStats = async (req, res, next) => {
  try {
    const rows = await Commissionnaire.findAll({ attributes: ["statut", "profil"] });
    return res.status(200).json({ data: countByActivity(rows) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// Aperçu « Sera généré : CMR-043 » de la fenêtre d'ajout. Le code définitif
// est attribué à l'enregistrement, sous verrou (il peut donc différer si
// quelqu'un d'autre ajoute une fiche entre-temps).
export const previewNextCode = async (req, res, next) => {
  try {
    const profil = PROFILS.includes(req.query.profil) ? req.query.profil : "COMMISSIONNAIRE";
    return res.status(200).json({ data: { profil, code: await peekSequenceCode(codePrefixOfProfil(profil)) } });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getAllCommissionnaires = async (req, res, next) => {
  try {
    const where = PROFILS.includes(req.query.profil) ? { profil: req.query.profil } : {};
    const commissionnaires = await Commissionnaire.findAll({
      where,
      include: [{ model: Person, as: "person" }],
      order: [["createdAt", "DESC"]],
    });
    const access = await commissionnaireAccess(req.user);
    return res.status(200).json({
      nombre: commissionnaires.length,
      stats: countByActivity(commissionnaires),
      data: commissionnaires.map((c) => serializeCommissionnaire(withClassement(c), access)),
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
    return res
      .status(200)
      .json(serializeCommissionnaire(withClassement(commissionnaire), await commissionnaireAccess(req.user)));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 4 - renforce le lien Client↔Commissionnaire : la fiche
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

/**
 * Ajout d'un commissionnaire ou d'un collecteur (P1.1).
 * - Le code (CMR-NNN ou CTR-NNN) est généré ici, sous verrou, jamais saisi.
 * - Pièce d'identité : type (carte d'électeur privilégiée, ou carte
 *   d'identité), numéro et recto obligatoires, verso facultatif ; JPG, PNG
 *   ou PDF de 5 Mo, contenu réel vérifié, stockage privé.
 * - Rattachement à une personne existante (`idPerson`) possible ; la pièce
 *   n'est alors exigée que si cette personne n'en a pas déjà une.
 */
export const createCommissionnaire = async (req, res, next) => {
  const body = req.body ?? {};
  const recto = req.files?.pieceRecto?.[0];
  const verso = req.files?.pieceVerso?.[0];
  const fail = (message) => res.status(400).json({ message });

  const profil = PROFILS.includes(body.profil) ? body.profil : "COMMISSIONNAIRE";
  const fullName = String(body.fullName ?? "").trim();
  const idDocumentType = body.idDocumentType || "CARTE_ELECTEUR";
  const idNumber = String(body.idNumber ?? "").trim();

  let existingPerson = null;
  if (body.idPerson) {
    existingPerson = await Person.findByPk(body.idPerson);
    if (!existingPerson) return res.status(404).json({ message: "Personne non trouvée." });
  } else if (!fullName) {
    return fail("Le nom complet est requis.");
  }

  const needsDocument = !existingPerson?.idDocumentPath;
  if (needsDocument) {
    if (!ID_DOCUMENT_TYPES.includes(idDocumentType)) {
      return fail("Choisissez le type de pièce : carte d'électeur ou carte d'identité.");
    }
    if (!idNumber && !existingPerson?.idNumber) return fail("Le numéro de la pièce d'identité est requis.");
    if (!recto) return fail("Joignez le recto de la pièce d'identité.");
  }

  let phone = null;
  if (String(body.phone ?? "").trim()) {
    phone = normalizePhone(body.phone);
    if (!phone) return fail("Le numéro de téléphone n'est pas valide.");
  }

  let stored = {};
  try {
    stored = recto || verso ? await storeIdentityDocumentPair({ recto, verso }) : {};
  } catch {
    return fail("La pièce d'identité n'a pas pu être lue : envoyez une photo JPG ou PNG, ou un PDF.");
  }

  try {
    const commissionnaire = await db.transaction(async (transaction) => {
      const documentFields = recto ? { ...stored, idDocumentType } : {};
      let person = existingPerson;
      if (person) {
        const missing = { ...documentFields };
        if (!person.idNumber && idNumber) missing.idNumber = idNumber;
        if (!person.phone && phone) missing.phone = phone;
        if (Object.keys(missing).length) await person.update(missing, { transaction });
      } else {
        person = await Person.create(
          { fullName, phone, email: String(body.email ?? "").trim() || null, idNumber: idNumber || null, ...documentFields },
          { transaction }
        );
      }

      return Commissionnaire.create(
        {
          idPerson: person.idPerson,
          profil,
          code: await nextSequenceCode(codePrefixOfProfil(profil), transaction),
          zone: String(body.zone ?? "").trim() || null,
          dateDebutActivite: body.dateDebutActivite || null,
          createdBy: req.user.idUser,
        },
        { transaction }
      );
    });

    const created = await Commissionnaire.findByPk(commissionnaire.idCommissionnaire, {
      include: [{ model: Person, as: "person" }],
    });

    await recordTimelineEvent({
      entityType: "COMMISSIONNAIRE",
      entityId: commissionnaire.idCommissionnaire,
      eventType: "CREATED",
      title: `${profilLabel(profil)} créé`,
      description: `${created.person.fullName} - ${commissionnaire.code}`,
      actorUserId: req.user.idUser,
    });

    return res.status(201).json({
      message: `${profilLabel(profil)} ajouté avec le code ${commissionnaire.code}.`,
      data: serializeCommissionnaire(withClassement(created), await commissionnaireAccess(req.user)),
    });
  } catch (error) {
    await deleteIdentityDocument(stored.idDocumentPath);
    await deleteIdentityDocument(stored.idDocumentVersoPath);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Ce code est déjà utilisé, réessayez." });
    }
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// Consultation de la pièce (recto par défaut, `?face=verso`).
export const getCommissionnaireIdentityDocument = async (req, res, next) => {
  try {
    const commissionnaire = await Commissionnaire.findByPk(req.params.id, {
      include: [{ model: Person, as: "person" }],
    });
    const person = commissionnaire?.person;
    const verso = req.query.face === "verso";
    const storedPath = verso ? person?.idDocumentVersoPath : person?.idDocumentPath;
    const absolute = storedPath ? resolveIdentityDocument(storedPath) : null;
    if (!absolute) return res.status(404).json({ message: "Aucune pièce d'identité enregistrée." });

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", "inline");
    res.type((verso ? person.idDocumentVersoMimeType : person.idDocumentMimeType) || "application/octet-stream");
    return res.sendFile(absolute, (error) => {
      if (error && !res.headersSent) res.status(404).json({ message: "Le fichier est introuvable." });
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// Ajout ou remplacement de la pièce depuis la fiche ; l'ancien fichier est
// supprimé une fois le nouveau enregistré.
export const replaceCommissionnaireIdentityDocument = async (req, res, next) => {
  const recto = req.files?.pieceRecto?.[0];
  const verso = req.files?.pieceVerso?.[0];
  const body = req.body ?? {};
  if (!recto && !verso) return res.status(400).json({ message: "Joignez au moins le recto ou le verso." });
  if (body.idDocumentType && !ID_DOCUMENT_TYPES.includes(body.idDocumentType)) {
    return res.status(400).json({ message: "Type de pièce inconnu." });
  }

  try {
    const commissionnaire = await Commissionnaire.findByPk(req.params.id, {
      include: [{ model: Person, as: "person" }],
    });
    if (!commissionnaire) return res.status(404).json({ message: "Commissionnaire non trouvé" });
    const person = commissionnaire.person;
    if (!recto && !person.idDocumentPath) {
      return res.status(400).json({ message: "Le recto de la pièce est requis." });
    }

    let stored;
    try {
      stored = await storeIdentityDocumentPair({ recto, verso });
    } catch {
      return res.status(400).json({ message: "La pièce d'identité n'a pas pu être lue : JPG, PNG ou PDF." });
    }

    const previous = { recto: person.idDocumentPath, verso: person.idDocumentVersoPath };
    const update = { ...stored };
    if (body.idDocumentType) update.idDocumentType = body.idDocumentType;
    if (String(body.idNumber ?? "").trim()) update.idNumber = String(body.idNumber).trim();
    await person.update(update);
    if (recto) await deleteIdentityDocument(previous.recto);
    if (verso) await deleteIdentityDocument(previous.verso);

    await recordTimelineEvent({
      entityType: "COMMISSIONNAIRE",
      entityId: commissionnaire.idCommissionnaire,
      eventType: "UPDATED",
      title: "Pièce d'identité mise à jour",
      actorUserId: req.user.idUser,
    });

    const refreshed = await Commissionnaire.findByPk(commissionnaire.idCommissionnaire, {
      include: COMMISSIONNAIRE_INCLUDES,
    });
    return res.status(200).json({
      message: "Pièce d'identité enregistrée.",
      data: serializeCommissionnaire(withClassement(refreshed), await commissionnaireAccess(req.user)),
    });
  } catch (error) {
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

    // BACK-G11 - suspension/exclusion d'un commissionnaire révoque
    // immédiatement toute session active, exactement comme pour un User
    // désactivé (CLAUDE.md §5) - seulement si la Person liée a un compte
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
// Milestone 4, pas encore construit - en attendant, un utilisateur autorisé
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

// CDC §7 - système d'incidents (retard, données incomplètes, non-respect
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

    // GOAL 13 - l'incident reste toujours enregistré (traçabilité), mais
    // son impact automatique sur le score/la grille d'évolution peut être
    // désactivé (ex. période de gestion manuelle assumée par un
    // superviseur) sans perdre l'historique des incidents eux-mêmes.
    const scoringEnabled = await getSettingValue("commissionnaire.scoringEnabled", true);
    if (scoringEnabled) {
      commissionnaire.scoreDiscipline = clampSubScore(
        Number(commissionnaire.scoreDiscipline) - Number(impactDiscipline ?? 0)
      );
      const previousStatut = commissionnaire.statut;
      applyEvolutionGrid(commissionnaire);
      await commissionnaire.save();
      emitScoreLowIfNewlyObserved(commissionnaire, previousStatut);
    }

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

/**
 * Clé d'accès d'un commissionnaire (P1.2) : crée son compte (rôle
 * commissionnaire) s'il n'en a pas, puis une clé à usage unique. Il se
 * connecte la première fois avec la clé et choisit son mot de passe.
 */
export const sendCommissionnaireAccessKey = async (req, res, next) => {
  try {
    const commissionnaire = await Commissionnaire.findByPk(req.params.id, {
      include: [{ model: Person, as: "person" }],
    });
    if (!commissionnaire) return res.status(404).json({ message: "Commissionnaire non trouvé" });
    const person = commissionnaire.person;

    let user = person.idUser ? await User.findByPk(person.idUser) : null;
    if (!user) {
      const email = String(req.body?.email || person.email || "").trim().toLowerCase();
      if (!email || !valideEmail(email)) {
        return res.status(400).json({ message: "Indiquez l'adresse e-mail qui servira à se connecter." });
      }
      if (await User.findOne({ where: { email } })) {
        return res.status(409).json({ message: "Cette adresse est déjà utilisée par un autre compte." });
      }
      // Mot de passe aléatoire jamais communiqué : la connexion passe par
      // la clé d'accès, puis par le mot de passe choisi par le titulaire.
      user = await User.create({
        fullName: person.fullName,
        email,
        password: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), await bcrypt.genSalt()),
        role: "commissionnaire",
        status: "ACTIVE",
      });
      await person.update({ idUser: user.idUser, email: person.email || email });
    }
    if (user.status === "INACTIVE") {
      return res.status(409).json({ message: "Le compte de ce commissionnaire est désactivé." });
    }

    const { token, expiresAt } = await issueAuthToken({
      idUser: user.idUser,
      purpose: "ACCESS_KEY",
      createdBy: req.user.idUser,
    });
    const base = (FRONT_URL || "https://nbnexpress.org").replace(/\/+$/, "");
    const link = `${base}/auth/activer?cle=${encodeURIComponent(token)}`;
    const hours = Number(process.env.ACCESS_KEY_TTL_HOURS || 72);

    let emailQueued = false;
    if (req.body?.sendEmail !== false) {
      await queueEmail({
        to: user.email,
        ...accessKeyEmail({ fullName: person.fullName, code: commissionnaire.code, accessKey: token, link, hours }),
      });
      emailQueued = true;
    }

    const phone = person.phone ? person.phone.replace(/^\+/, "") : null;
    const whatsappText = `Bonjour ${person.fullName}, voici votre accès à l'espace commissionnaire NBN Express (code ${commissionnaire.code}).\nClé d'accès : ${token} (valable ${hours} h, usage unique)\nActivez votre espace ici : ${link}`;

    await recordTimelineEvent({
      entityType: "COMMISSIONNAIRE",
      entityId: commissionnaire.idCommissionnaire,
      eventType: "ACCESS_KEY_SENT",
      title: "Clé d'accès envoyée",
      description: emailQueued ? `Par e-mail à ${user.email}` : "À transmettre par l'agence",
      actorUserId: req.user.idUser,
    });

    return res.status(200).json({
      message: emailQueued ? `Clé d'accès envoyée à ${user.email}.` : "Clé d'accès générée.",
      data: {
        accessKey: token,
        link,
        expiresAt,
        email: user.email,
        emailQueued,
        whatsappLink: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappText)}` : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
