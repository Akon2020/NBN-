import { Op } from "sequelize";
import db from "../database/db.js";
import { RentalRequest, Client, Person } from "../models/index.model.js";
import { recordTimelineEvent } from "../shared/timeline.js";
import { createAlert } from "../services/notification.service.js";
import { resolveQuartier } from "../shared/bukavuLocations.js";
import { MODALITES_PAIEMENT } from "../shared/paymentTerms.js";
import {
  checkEmail,
  normalizeCommissionnaireCode,
  normalizePhone,
} from "../utils/contactValidation.js";

// Champs repris tels quels depuis le formulaire public — liste explicite
// (jamais un `req.body` propagé en bloc) : une demande publique non
// authentifiée ne doit jamais pouvoir écrire un champ non prévu.
const REQUEST_FIELDS = [
  "fullName",
  "phone",
  "email",
  "lieuProvenance",
  "residenceActuelle",
  "sexe",
  "typeClient",
  "canalContact",
  "canalContactAutre",
  "typesBien",
  "typeBienAutre",
  "usageBien",
  "ville",
  "villeAutre",
  "commune",
  "quartier",
  "avenues",
  "budgetMin",
  "loyerMax",
  "devise",
  "modalitePaiement",
  "modalitePaiementAutre",
  "chargesIncluses",
  "nombreChambres",
  "nombreChambresAutre",
  "nombreSalons",
  "nombreToilettes",
  "equipements",
  "avantages",
  "avantageAutre",
  "urgence",
  "urgenceAutre",
  "dateEntree",
  "typeOccupants",
  "nombreOccupants",
  "elementsParticuliers",
  "orienteParAgent",
  "codeCommissionnaire",
  "autresInfos",
];

// Correspondances vers le vocabulaire CRM déjà en place sur `Client` —
// les deux modèles ont volontairement des libellés distincts (le
// formulaire parle la langue du client, le CRM celle de l'agence).
const SOUS_TYPE_BY_TYPE_CLIENT = {
  PARTICULIER: "PARTICULIER",
  PROFESSIONNEL: "PROFESSIONNEL",
  ENTREPRISE: "ENTREPRISE",
  EXPATRIE: "DIASPORA",
};

const SOURCE_BY_CANAL = {
  TERRAIN: "TERRAIN",
  APPEL: "APPEL",
  WHATSAPP: "WHATSAPP",
  RESEAU: "RECOMMANDATION",
};

const BESOIN_USAGE_BY_USAGE = {
  HABITATION: "HABITATION",
  BUREAU: "PROFESSIONNEL",
  COMMERCIAL: "COMMERCIAL",
  MIXTE: "MIXTE",
};

const CLIENT_URGENCES = ["IMMEDIAT", "1_2_SEMAINES", "1_MOIS", "FLEXIBLE"];

const buildLocalisation = ({ commune, quartier, avenues }) =>
  [commune, quartier, avenues].filter(Boolean).join(" — ") || null;

const TYPES_OCCUPANTS = ["FAMILLE_NOMBREUSE", "FAMILLE_PEU_NOMBREUSE", "COUPLE", "AUTRE"];
const URGENCES = [...CLIENT_URGENCES, "AUTRE"];

const text = (value) => String(value ?? "").trim();

// Les champs marqués obligatoires dans le formulaire le sont aussi ici :
// la page publique n'est qu'un client parmi d'autres de cette route, la
// règle ne peut pas vivre uniquement dans le navigateur. Renvoie soit
// `{ error }` (premier manque rencontré, dans l'ordre du formulaire), soit
// `{ values }` normalisées.
const validateRentalRequest = async (body) => {
  const fail = (error) => ({ error });

  const fullName = text(body.fullName);
  if (!fullName) return fail("Le nom complet est requis.");

  const phone = normalizePhone(body.phone);
  if (!phone) {
    return fail("Le numéro de téléphone n'est pas valide. Exemple : +243 977 103 143.");
  }

  const emailCheck = await checkEmail(body.email);
  if (!emailCheck.ok) return fail(emailCheck.reason);

  if (!body.canalContact) return fail("Indiquez comment vous nous avez connus.");
  if (body.canalContact === "AUTRE" && !text(body.canalContactAutre)) {
    return fail("Précisez comment vous nous avez connus.");
  }

  if (!Array.isArray(body.typesBien) || body.typesBien.length === 0) {
    return fail("Indiquez le type de bien recherché.");
  }
  if (body.typesBien.includes("AUTRE") && !text(body.typeBienAutre)) {
    return fail("Précisez le type de bien recherché.");
  }
  if (!body.usageBien) return fail("Indiquez l'usage du bien.");

  if (!body.ville) return fail("Indiquez la ville souhaitée.");
  if (body.ville === "AUTRE" && !text(body.villeAutre)) return fail("Précisez la ville souhaitée.");

  let quartier = text(body.quartier);
  if (body.ville === "BUKAVU") {
    if (!body.commune) return fail("Indiquez la commune souhaitée.");
    quartier = resolveQuartier(body.commune, quartier);
    if (!quartier) return fail("Le quartier choisi n'appartient pas à cette commune.");
  } else if (!quartier) {
    return fail("Indiquez le quartier souhaité.");
  }
  if (!text(body.avenues)) return fail("Indiquez au moins une avenue souhaitée.");

  const budgetMin = Number(body.budgetMin);
  const loyerMax = Number(body.loyerMax);
  if (!(budgetMin > 0) || !(loyerMax > 0)) {
    return fail("Indiquez votre budget minimum et maximum.");
  }
  if (budgetMin > loyerMax) {
    return fail("Le budget minimum ne peut pas dépasser le budget maximum.");
  }

  if (!MODALITES_PAIEMENT.includes(body.modalitePaiement)) {
    return fail("Indiquez la modalité de paiement.");
  }
  if (body.modalitePaiement === "AUTRE" && !text(body.modalitePaiementAutre)) {
    return fail("Précisez la modalité de paiement.");
  }

  if (!URGENCES.includes(body.urgence)) return fail("Indiquez l'urgence de votre recherche.");
  if (body.urgence === "AUTRE" && !text(body.urgenceAutre)) return fail("Précisez l'urgence.");

  if (!TYPES_OCCUPANTS.includes(body.typeOccupants)) {
    return fail("Indiquez qui occupera le logement.");
  }
  let nombreOccupants = null;
  if (body.typeOccupants === "AUTRE") {
    nombreOccupants = Number.parseInt(body.nombreOccupants, 10);
    if (!(nombreOccupants >= 1)) return fail("Précisez le nombre d'occupants.");
  }

  if (!Array.isArray(body.elementsParticuliers) || body.elementsParticuliers.length === 0) {
    return fail("Indiquez les éléments à prendre en compte (ou « Aucune »).");
  }

  if (typeof body.orienteParAgent !== "boolean") {
    return fail("Indiquez si vous avez été orienté par un agent ou un commissionnaire.");
  }
  let codeCommissionnaire = null;
  if (body.orienteParAgent) {
    codeCommissionnaire = normalizeCommissionnaireCode(body.codeCommissionnaire);
    if (!codeCommissionnaire) {
      return fail("Le code commissionnaire est requis, au format CCM-042.");
    }
  }

  return {
    values: {
      fullName,
      phone,
      email: emailCheck.email,
      quartier,
      budgetMin,
      loyerMax,
      nombreOccupants,
      orienteParAgent: body.orienteParAgent,
      codeCommissionnaire,
    },
  };
};

// Route PUBLIQUE (aucune authentification) : le client final n'a pas de
// compte dans ce système (CLAUDE.md §4, une Person devient Client, jamais
// un User). Chaque soumission crée la trace figée de la demande ET place
// le client sur le pipeline commercial, dans une seule transaction.
export const createRentalRequest = async (req, res, next) => {
  if (req.body?.conditionsAccepted !== true) {
    return res.status(400).json({
      message: "Les conditions doivent être acceptées pour soumettre la demande.",
    });
  }

  // Validation (DNS compris) hors transaction : aucune connexion MySQL
  // n'est retenue pendant la vérification de l'adresse e-mail.
  const { error: validationError, values } = await validateRentalRequest(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const transaction = await db.transaction();
  try {
    const { fullName, phone: normalizedPhone, email, codeCommissionnaire } = values;

    // Une même personne qui redemande (nouveau besoin, ou formulaire
    // resoumis) ne doit jamais créer un doublon d'identité : le téléphone
    // est la clé de rapprochement réellement fiable ici (pas de compte,
    // pas d'email obligatoire).
    let person = await Person.findOne({ where: { phone: normalizedPhone }, transaction });
    if (!person) {
      person = await Person.create({ fullName, phone: normalizedPhone, email }, { transaction });
    } else if (!person.email) {
      // Une adresse déjà connue n'est jamais écrasée par une saisie
      // publique : elle peut avoir été corrigée par l'agence.
      await person.update({ email }, { transaction });
    }

    // Un client actif déjà rattaché à cette personne est réutilisé plutôt
    // que dupliqué — sa position dans le pipeline est conservée telle
    // quelle (une nouvelle demande ne fait jamais reculer un dossier déjà
    // en négociation).
    let client = await Client.findOne({
      where: { idPerson: person.idPerson, archivedAt: null },
      transaction,
    });
    const isNewClient = !client;

    const localisation = buildLocalisation({ ...req.body, quartier: values.quartier });

    const clientData = {
      idPerson: person.idPerson,
      type: "LOCATAIRE",
      sousType: SOUS_TYPE_BY_TYPE_CLIENT[req.body.typeClient] || null,
      source: codeCommissionnaire
        ? "COMMISSIONNAIRE"
        : SOURCE_BY_CANAL[req.body.canalContact] || null,
      sourceCommissionnaireCode: codeCommissionnaire,
      besoinTypeBien: Array.isArray(req.body.typesBien) ? req.body.typesBien.join(", ") : null,
      besoinUsage: BESOIN_USAGE_BY_USAGE[req.body.usageBien] || null,
      localisationVille: req.body.ville === "AUTRE" ? req.body.villeAutre || null : req.body.ville || null,
      localisationQuartiers: localisation,
      budgetMin: values.budgetMin,
      budgetMax: values.loyerMax,
      urgence: CLIENT_URGENCES.includes(req.body.urgence) ? req.body.urgence : null,
      dateSouhaitee: req.body.dateEntree || null,
    };

    if (isNewClient) {
      client = await Client.create({ ...clientData, statutPipeline: "NOUVEAU" }, { transaction });
      await client.update(
        {
          dossierNumber: `CLI-${new Date().getFullYear()}-${String(client.idClient).padStart(6, "0")}`,
        },
        { transaction }
      );
    } else {
      // Le besoin exprimé est rafraîchi, mais jamais `statutPipeline` :
      // l'avancement commercial reste la décision de l'agence.
      await client.update(clientData, { transaction });
    }

    const requestData = { conditionsAcceptedAt: new Date(), idClient: client.idClient };
    REQUEST_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) requestData[field] = req.body[field];
    });
    // Les valeurs normalisées priment sur la saisie brute.
    Object.assign(requestData, values);

    const rentalRequest = await RentalRequest.create(requestData, { transaction });

    await transaction.commit();

    await recordTimelineEvent({
      entityType: "CLIENT",
      entityId: client.idClient,
      eventType: isNewClient ? "CREATED" : "STATUT_CHANGED",
      title: isNewClient
        ? "Client créé depuis une demande de location publique"
        : "Nouvelle demande de location reçue",
      description: localisation,
      metadata: { idRentalRequest: rentalRequest.idRentalRequest },
    });

    // L'équipe commerciale doit être avertie sans dépendre de la
    // consultation manuelle d'un écran (même canal que les autres alertes
    // métier, GOAL 14/20).
    await createAlert({
      type: "rental_request:new",
      title: `Nouvelle demande de location — ${fullName}`,
      description: localisation,
      severite: "INFO",
      relatedEntityType: "Client",
      relatedEntityId: client.idClient,
    });

    // Réponse volontairement minimale : une route publique ne renvoie
    // jamais la fiche client complète ni le contenu de la base.
    return res.status(201).json({
      message: "Votre demande a bien été enregistrée. Notre équipe vous recontactera.",
      data: {
        idRentalRequest: rentalRequest.idRentalRequest,
        dossierNumber: client.dossierNumber,
      },
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getAllRentalRequests = async (req, res, next) => {
  try {
    const { q } = req.query;
    const where = {};
    if (q) {
      where[Op.or] = [{ fullName: { [Op.like]: `%${q}%` } }, { phone: { [Op.like]: `%${q}%` } }];
    }

    const requests = await RentalRequest.findAll({
      where,
      include: [
        {
          model: Client,
          as: "client",
          attributes: ["idClient", "dossierNumber", "statutPipeline"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });

    return res.status(200).json({ nombre: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getSingleRentalRequest = async (req, res, next) => {
  try {
    const request = await RentalRequest.findByPk(req.params.id, {
      include: [
        {
          model: Client,
          as: "client",
          attributes: ["idClient", "dossierNumber", "statutPipeline"],
          required: false,
        },
      ],
    });
    if (!request) {
      return res.status(404).json({ message: "Demande non trouvée" });
    }
    return res.status(200).json({ data: request });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
