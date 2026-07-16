import crypto from "crypto";
import { Op } from "sequelize";
import {
  Requisition,
  Caisse,
  CaisseBalance,
  Currency,
  User,
} from "../models/index.model.js";
import { generateRequisitionPdf } from "../utils/requisitionPdf.js";
import { eventBus } from "../shared/eventBus.js";
import { createArchiveHandlers } from "../utils/archivable.js";

const REQUISITION_INCLUDES = [
  { model: User, as: "demandeur", attributes: ["idUser", "fullName", "email"] },
  { model: User, as: "decideur", attributes: ["idUser", "fullName", "email"] },
  { model: Caisse, as: "caisse", attributes: ["idCaisse", "label"] },
  { model: Currency, as: "currency" },
];

const generateValidationCode = () =>
  `REQ-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

// info.md §6, étape "Saisie" + "Vérification" (contrôle automatique des
// champs obligatoires et de la conformité budgétaire). La conformité
// budgétaire vérifiée ici est structurelle (la devise demandée est bien
// une devise suivie par la caisse ciblée) — la suffisance réelle du solde
// est une question de décaissement (BACK-G14), pas de recevabilité de la
// demande : plusieurs réquisitions concurrentes peuvent légitimement viser
// la même caisse avant qu'aucune ne soit décaissée.
export const createRequisition = async (req, res, next) => {
  try {
    const { idCaisse, nature, quantite, coutEstime, currencyCode, justificatif } = req.body;

    if (!idCaisse || !nature || !coutEstime || !currencyCode) {
      return res
        .status(400)
        .json({ message: "idCaisse, nature, coutEstime et currencyCode sont requis." });
    }
    if (Number(coutEstime) <= 0) {
      return res.status(400).json({ message: "coutEstime doit être strictement positif." });
    }

    const caisse = await Caisse.findByPk(idCaisse);
    if (!caisse) {
      return res.status(404).json({ message: "Caisse non trouvée" });
    }
    if (caisse.statut === "CLOTUREE") {
      return res.status(400).json({ message: "Cette caisse est clôturée." });
    }

    const balance = await CaisseBalance.findOne({
      where: { idCaisse, currencyCode: currencyCode.toUpperCase() },
    });
    if (!balance) {
      return res.status(400).json({
        message: "Conformité budgétaire : cette caisse ne suit pas la devise demandée.",
      });
    }

    const requisition = await Requisition.create({
      demandeurId: req.user.idUser,
      idCaisse,
      nature,
      quantite: quantite || null,
      coutEstime,
      currencyCode: currencyCode.toUpperCase(),
      justificatif: justificatif || null,
    });

    const created = await Requisition.findByPk(requisition.idRequisition, {
      include: REQUISITION_INCLUDES,
    });
    return res.status(201).json({ message: "Réquisition soumise avec succès", data: created });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// info.md §6, étape "Archivage" — recherche par filtres pour audit. Aucune
// réquisition n'est jamais supprimée, la liste complète reste toujours
// consultable.
export const getAllRequisitions = async (req, res, next) => {
  try {
    const { statut, idCaisse, from, to, includeArchived } = req.query;
    const where = {};
    if (statut) where.statut = statut;
    if (idCaisse) where.idCaisse = idCaisse;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }
    // BACK-G21 — désencombre les listes actives par défaut sans jamais
    // supprimer la traçabilité (info.md §6).
    if (includeArchived !== "true") where.archivedAt = null;

    const requisitions = await Requisition.findAll({
      where,
      include: REQUISITION_INCLUDES,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: requisitions.length, data: requisitions });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getMyRequisitions = async (req, res, next) => {
  try {
    const requisitions = await Requisition.findAll({
      where: { demandeurId: req.user.idUser },
      include: REQUISITION_INCLUDES,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: requisitions.length, data: requisitions });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const decideRequisition = async (req, res, next, { statut, requireMotif, generateCode }) => {
  try {
    const { motifDecision } = req.body || {};
    if (requireMotif && !motifDecision) {
      return res.status(400).json({ message: "Un motif est requis pour cette action." });
    }

    const requisition = await Requisition.findByPk(req.params.id);
    if (!requisition) {
      return res.status(404).json({ message: "Réquisition non trouvée" });
    }
    if (requisition.statut === "APPROUVEE" || requisition.statut === "REJETEE") {
      return res.status(400).json({ message: "Cette réquisition a déjà été traitée." });
    }

    await requisition.update({
      statut,
      motifDecision: motifDecision || null,
      validationCode: generateCode ? generateValidationCode() : requisition.validationCode,
      decidedBy: req.user.idUser,
      decidedAt: new Date(),
    });

    const updated = await Requisition.findByPk(requisition.idRequisition, {
      include: REQUISITION_INCLUDES,
    });

    // BACK-G17 — événement métier, jamais un envoi de notification en
    // dur ici : le listener (shared/eventListeners.js) décide de la
    // conséquence, ce contrôleur ne fait qu'annoncer le fait.
    if (statut === "APPROUVEE") {
      eventBus.emit("requisition:approved", { requisition: updated });
    } else if (statut === "REJETEE") {
      eventBus.emit("requisition:rejected", { requisition: updated });
    }

    return res.status(200).json({ message: "Réquisition mise à jour", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// info.md §6, étape "Approbation" — la trésorière valide, rejette (motif),
// ou demande un complément.
export const approveRequisition = (req, res, next) =>
  decideRequisition(req, res, next, {
    statut: "APPROUVEE",
    requireMotif: false,
    generateCode: true, // étape "Génération" : code de validation unique émis dès l'approbation.
  });

export const rejectRequisition = (req, res, next) =>
  decideRequisition(req, res, next, { statut: "REJETEE", requireMotif: true, generateCode: false });

export const requestRequisitionComplement = (req, res, next) =>
  decideRequisition(req, res, next, {
    statut: "COMPLEMENT_DEMANDE",
    requireMotif: true,
    generateCode: false,
  });

// info.md §6, étape "Génération" — PDF rendu à la demande à partir des
// données figées à l'approbation (jamais stocké sur disque, voir
// utils/requisitionPdf.js).
export const getRequisitionPdf = async (req, res, next) => {
  try {
    const requisition = await Requisition.findByPk(req.params.id, {
      include: [
        { model: User, as: "demandeur", attributes: ["idUser", "fullName"] },
        { model: User, as: "decideur", attributes: ["idUser", "fullName"] },
        { model: Caisse, as: "caisse", attributes: ["idCaisse", "label"] },
      ],
    });
    if (!requisition) {
      return res.status(404).json({ message: "Réquisition non trouvée" });
    }
    if (requisition.statut !== "APPROUVEE") {
      return res
        .status(400)
        .json({ message: "Le document ne peut être généré que pour une réquisition approuvée." });
    }

    const pdfBytes = await generateRequisitionPdf(requisition.toJSON());

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="requisition-${requisition.validationCode}.pdf"`
    );
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// BACK-G21 — archivage métier (une réquisition approuvée/rejetée ancienne
// se désencombre des listes actives sans jamais être supprimée, voir le
// commentaire du modèle). Aucun endpoint de suppression n'existe pour les
// réquisitions (traçabilité indéfinie, info.md §6) — seul l'archivage
// s'applique ici, pas de soft delete.
export const { archiveResource: archiveRequisition, unarchiveResource: unarchiveRequisition } =
  createArchiveHandlers(Requisition, "idRequisition", "Réquisition non trouvée");
