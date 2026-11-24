import { notifyFieldAgent } from "../services/formNotifications.service.js";
import { getSettingValue } from "../shared/appSettings.js";
import { propertyKindOf } from "../shared/propertyKinds.js";
import {
  Commission,
  Client,
  Property,
  User,
  Commissionnaire,
  Person,
  Currency,
  Caisse,
  CaisseBalance,
} from "../models/index.model.js";

const COMMISSION_INCLUDES = [
  { model: Client, as: "client", attributes: ["idClient", "type", "statutPipeline"] },
  { model: Property, as: "property", attributes: ["idProperty", "quartier", "price"] },
  { model: User, as: "beneficiaireUser", attributes: ["idUser", "fullName"] },
  {
    model: Commissionnaire,
    as: "commissionnaire",
    attributes: ["idCommissionnaire", "code"],
    include: [{ model: Person, as: "person", attributes: ["fullName"] }],
  },
  { model: Currency, as: "currency" },
  { model: Caisse, as: "caisse", attributes: ["idCaisse", "label"] },
  { model: User, as: "creator", attributes: ["idUser", "fullName"] },
];

// CDC - commission agence/agent/commissionnaire calculée à partir d'une
// transaction immobilière conclue (Client.statutPipeline === "CONCLU").
// Le montant de la commission est soit fourni directement
// (montantCommission), soit dérivé d'un taux appliqué au montant de la
// transaction - jamais les deux à la fois pour éviter une incohérence
// silencieuse entre le taux affiché et le montant réellement dû.
export const createCommission = async (req, res, next) => {
  try {
    const {
      idClient,
      idProperty,
      beneficiaireType,
      beneficiaireUserId,
      montantTransaction,
      currencyCode,
      tauxCommission,
      montantCommission,
    } = req.body;

    if (!idClient || !beneficiaireType || !montantTransaction || !currencyCode) {
      return res.status(400).json({
        message: "idClient, beneficiaireType, montantTransaction et currencyCode sont requis.",
      });
    }
    // Commission d'un commissionnaire sans montant saisi : règle réglée
    // dans Paramètres (commissions.commissionnaireRule), si l'agence en a
    // choisi une. Sinon, montant ou taux restent à saisir.
    let ruleRate = null;
    let ruleAmount = null;
    if (!tauxCommission && !montantCommission && beneficiaireType === "COMMISSIONNAIRE") {
      const rule = await getSettingValue("commissions.commissionnaireRule", { mode: "MANUEL" });
      const property = idProperty ? await Property.findByPk(idProperty, { attributes: ["propertyType"] }) : null;
      const kind = property ? propertyKindOf(property.propertyType) : null;
      const value = (kind && rule?.parType?.[kind]) ?? rule?.valeur;
      if (rule?.mode === "POURCENTAGE" && value != null) ruleRate = Number(value);
      if (rule?.mode === "MONTANT_FIXE" && value != null) ruleAmount = Number(value);
    }
    if (!tauxCommission && !montantCommission && ruleRate === null && ruleAmount === null) {
      return res.status(400).json({
        message: "tauxCommission ou montantCommission est requis (aucune règle de calcul n'est définie dans Paramètres).",
      });
    }
    if (!["AGENCE", "AGENT", "COMMISSIONNAIRE"].includes(beneficiaireType)) {
      return res
        .status(400)
        .json({ message: "beneficiaireType doit être AGENCE, AGENT ou COMMISSIONNAIRE." });
    }

    const client = await Client.findByPk(idClient);
    if (!client) {
      return res.status(404).json({ message: "Client non trouvé" });
    }
    if (client.statutPipeline !== "CONCLU") {
      return res.status(400).json({
        message: "Seule une transaction conclue (pipeline CONCLU) peut générer une commission.",
      });
    }

    let idCommissionnaire = null;
    if (beneficiaireType === "COMMISSIONNAIRE") {
      if (!client.sourceCommissionnaireCode) {
        return res.status(400).json({
          message: "Ce client n'a pas de commissionnaire source associé.",
        });
      }
      const commissionnaire = await Commissionnaire.findOne({
        where: { code: client.sourceCommissionnaireCode },
      });
      if (!commissionnaire) {
        return res.status(404).json({ message: "Commissionnaire source introuvable." });
      }
      idCommissionnaire = commissionnaire.idCommissionnaire;
    }
    if (beneficiaireType === "AGENT" && !beneficiaireUserId) {
      return res
        .status(400)
        .json({ message: "beneficiaireUserId est requis pour une commission AGENT." });
    }

    const effectiveRate = tauxCommission || ruleRate;
    const finalMontantCommission = montantCommission
      ? Number(montantCommission)
      : ruleAmount !== null
        ? ruleAmount
        : Math.round(Number(montantTransaction) * (Number(effectiveRate) / 100) * 100) / 100;

    const commission = await Commission.create({
      idClient,
      idProperty: idProperty || null,
      beneficiaireType,
      beneficiaireUserId: beneficiaireType === "AGENT" ? beneficiaireUserId : null,
      idCommissionnaire,
      montantTransaction,
      currencyCode: currencyCode.toUpperCase(),
      tauxCommission: effectiveRate || null,
      montantCommission: finalMontantCommission,
      createdBy: req.user.idUser,
    });

    const created = await Commission.findByPk(commission.idCommission, {
      include: COMMISSION_INCLUDES,
    });
    return res.status(201).json({ message: "Commission calculée avec succès", data: created });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getAllCommissions = async (req, res, next) => {
  try {
    const { statut, beneficiaireType, idCommissionnaire } = req.query;
    const where = {};
    if (statut) where.statut = statut;
    if (beneficiaireType) where.beneficiaireType = beneficiaireType;
    if (idCommissionnaire) where.idCommissionnaire = idCommissionnaire;

    const commissions = await Commission.findAll({
      where,
      include: COMMISSION_INCLUDES,
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: commissions.length, data: commissions });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// Marque une commission comme due pour paiement - désigne la caisse qui la
// décaissera. Distinct du calcul initial : une commission peut être
// calculée bien avant d'être réellement exigible (ex. délai contractuel).
export const markCommissionDue = async (req, res, next) => {
  try {
    const { idCaisse } = req.body;
    if (!idCaisse) {
      return res.status(400).json({ message: "idCaisse est requis." });
    }

    const commission = await Commission.findByPk(req.params.id);
    if (!commission) {
      return res.status(404).json({ message: "Commission non trouvée" });
    }
    if (commission.statut !== "CALCULEE") {
      return res
        .status(400)
        .json({ message: "Seule une commission CALCULEE peut être marquée DUE." });
    }

    const caisse = await Caisse.findByPk(idCaisse);
    if (!caisse) {
      return res.status(404).json({ message: "Caisse non trouvée" });
    }
    const balance = await CaisseBalance.findOne({
      where: { idCaisse, currencyCode: commission.currencyCode },
    });
    if (!balance) {
      return res.status(400).json({
        message: "Conformité budgétaire : cette caisse ne suit pas la devise de la commission.",
      });
    }

    await commission.update({ statut: "DUE", idCaisse });

    // « Votre paiement est prêt » au commissionnaire bénéficiaire (P1.2).
    if (commission.idCommissionnaire) {
      const agent = await Commissionnaire.findByPk(commission.idCommissionnaire, {
        include: [{ model: Person, as: "person" }],
      });
      await notifyFieldAgent(agent, {
        type: "field_agent:commission_ready",
        title: "Votre commission est prête",
        message: `${Number(commission.montantCommission).toLocaleString("fr-FR")} ${commission.currencyCode} : présentez-vous à la caisse.`,
      }).catch((error) => console.error("Notification de commission :", error.message));
    }

    const updated = await Commission.findByPk(commission.idCommission, {
      include: COMMISSION_INCLUDES,
    });
    return res.status(200).json({ message: "Commission marquée due", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
