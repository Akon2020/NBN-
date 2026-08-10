import { Op } from "sequelize";
import db from "../database/db.js";
import { RentalRequest, Client, Person } from "../models/index.model.js";
import { recordTimelineEvent } from "../shared/timeline.js";
import { createAlert } from "../services/notification.service.js";

// Champs repris tels quels depuis le formulaire public — liste explicite
// (jamais un `req.body` propagé en bloc) : une demande publique non
// authentifiée ne doit jamais pouvoir écrire un champ non prévu.
const REQUEST_FIELDS = [
  "fullName",
  "phone",
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

// Route PUBLIQUE (aucune authentification) : le client final n'a pas de
// compte dans ce système (CLAUDE.md §4, une Person devient Client, jamais
// un User). Chaque soumission crée la trace figée de la demande ET place
// le client sur le pipeline commercial, dans une seule transaction.
export const createRentalRequest = async (req, res, next) => {
  const transaction = await db.transaction();
  try {
    const { fullName, phone, conditionsAccepted } = req.body;

    if (!fullName || !phone) {
      await transaction.rollback();
      return res.status(400).json({ message: "Le nom complet et le téléphone sont requis." });
    }
    if (conditionsAccepted !== true) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Les conditions doivent être acceptées pour soumettre la demande.",
      });
    }

    const normalizedPhone = String(phone).trim();

    // Une même personne qui redemande (nouveau besoin, ou formulaire
    // resoumis) ne doit jamais créer un doublon d'identité : le téléphone
    // est la clé de rapprochement réellement fiable ici (pas de compte,
    // pas d'email obligatoire).
    let person = await Person.findOne({ where: { phone: normalizedPhone }, transaction });
    if (!person) {
      person = await Person.create(
        { fullName: String(fullName).trim(), phone: normalizedPhone },
        { transaction }
      );
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

    const orienteParAgent = req.body.orienteParAgent === true;
    const codeCommissionnaire = orienteParAgent ? req.body.codeCommissionnaire || null : null;

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
      localisationQuartiers: buildLocalisation(req.body),
      budgetMax: req.body.loyerMax || null,
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
    requestData.orienteParAgent = orienteParAgent;
    requestData.codeCommissionnaire = codeCommissionnaire;

    const rentalRequest = await RentalRequest.create(requestData, { transaction });

    await transaction.commit();

    await recordTimelineEvent({
      entityType: "CLIENT",
      entityId: client.idClient,
      eventType: isNewClient ? "CREATED" : "STATUT_CHANGED",
      title: isNewClient
        ? "Client créé depuis une demande de location publique"
        : "Nouvelle demande de location reçue",
      description: buildLocalisation(req.body),
      metadata: { idRentalRequest: rentalRequest.idRentalRequest },
    });

    // L'équipe commerciale doit être avertie sans dépendre de la
    // consultation manuelle d'un écran (même canal que les autres alertes
    // métier, GOAL 14/20).
    await createAlert({
      type: "rental_request:new",
      title: `Nouvelle demande de location — ${fullName}`,
      description: buildLocalisation(req.body),
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
