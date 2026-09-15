import { randomUUID } from "crypto";
import { Op } from "sequelize";
import db from "../database/db.js";
import {
  Property,
  RentalProperty,
  SaleProperty,
  PropertyPhone,
  Person,
  Bailleur,
  Commissionnaire,
  Mission,
} from "../models/index.model.js";
import { recalculatePropertyMargin } from "../shared/marginCalculator.js";
import { recordTimelineEvent } from "../shared/timeline.js";
import { createAlert } from "../services/notification.service.js";
import { resolveQuartier } from "../shared/bukavuLocations.js";
import { MODALITES_PAIEMENT } from "../shared/paymentTerms.js";
import {
  checkEmail,
  normalizeCommissionnaireCode,
  normalizePhone,
} from "../utils/contactValidation.js";
import { deleteIdentityDocument, storeIdentityDocument } from "../utils/identityDocuments.js";

const MISSION_TYPES = ["COLLECTE_BIEN", "APPORT_CLIENT", "SUIVI", "MISE_A_JOUR"];
const PROPERTY_TYPES = [
  "APPARTEMENT",
  "MAISON",
  "CONSTRUCTION_DURABLE",
  "CONSTRUCTION_SEMI_DURABLE",
  "TERRAIN_PLAT",
  "TERRAIN_PENTE",
  "PARCELLE",
  "CHAMBRE",
];
const COMMUNES = ["IBANDA", "KADUTU", "BAGIRA"];

// Qui remplit le formulaire : le responsable du bien lui-même, ou un
// collecteur (commissionnaire ou membre de l'équipe) qui le relève.
const REMPLISSEURS = ["RESPONSABLE", "COLLECTEUR"];
const RESPONSABLE_STATUTS = ["PROPRIETAIRE", "MANDATAIRE", "GERANT", "SOCIETE"];
const DISPONIBILITES_VISITE = ["OUI", "NON", "SUR_PROGRAMME"];
const ACCEPTATIONS_COMMISSION = ["OUI", "NON", "A_NEGOCIER"];

// Composition obligatoire : « 0 » est une réponse, l'absence n'en est pas
// une (on ne sait pas si la pièce manque ou si la question a été sautée).
const COUNT_FIELDS = {
  bedrooms: "chambres",
  toilets: "salles de bain",
  livingRooms: "salons",
  kitchens: "cuisines",
  depots: "dépôts",
};

// Relevés d'état/accès restés facultatifs, repris tels quels — liste
// explicite, jamais `req.body` propagé : ce formulaire est atteignable sans
// authentification, aucun champ non prévu ne doit pouvoir être écrit (ni
// `margin`, ni `statut`, ni `assignedTo`).
const OPTIONAL_FIELDS = [
  "hasElectricity",
  "hasWater",
  "accessibilite",
  "disponibilite",
  "etatBien",
  "observations",
  "description",
];

const text = (value) => String(value ?? "").trim();

// Un bien collecté sur le terrain arrive rarement avec un prix « propre » :
// le formulaire accepte une saisie libre ("250$", "250 000 FC"), on en
// extrait la partie numérique plutôt que de rejeter la soumission d'un
// agent qui est déjà reparti du terrain.
const parseAmount = (raw) => {
  if (raw === undefined || raw === null || raw === "") return null;
  const numeric = String(raw).replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseCount = (raw) => {
  if (raw === undefined || raw === null || text(raw) === "") return null;
  const parsed = Number.parseInt(String(raw), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

// Renvoie `{ error }` (premier manque, dans l'ordre du formulaire) ou
// `{ values }` normalisées. Même règles que les étapes du formulaire web,
// qui n'est qu'un client parmi d'autres de cette route.
const validateCollection = async (body, file) => {
  const fail = (error) => ({ error });

  if (!REMPLISSEURS.includes(body.remplisseur)) {
    return fail("Indiquez qui remplit ce formulaire (le responsable du bien ou un collecteur).");
  }
  const parResponsable = body.remplisseur === "RESPONSABLE";
  if (!parResponsable && typeof body.parCommissionnaire !== "boolean") {
    return fail("Indiquez si le bien est collecté par un commissionnaire.");
  }
  const parCommissionnaire = !parResponsable && body.parCommissionnaire === true;

  if (!MISSION_TYPES.includes(body.typeMission)) return fail("Le type de mission est requis.");
  if (!["RENT", "SALE"].includes(body.typeOperation)) {
    return fail("Le type d'opération (location/vente) est requis.");
  }
  if (!PROPERTY_TYPES.includes(body.propertyType)) return fail("Le type de bien est requis.");

  // --- Localisation (obligatoire) ---
  if (!COMMUNES.includes(body.commune)) return fail("La commune est requise.");
  if (!text(body.quartier)) return fail("Le quartier est requis.");
  const quartier = resolveQuartier(body.commune, body.quartier);
  if (!quartier) return fail("Le quartier choisi n'appartient pas à cette commune.");
  const avenue = text(body.avenue);
  if (!avenue) return fail("L'avenue est requise.");

  // --- Prix ---
  const price = parseAmount(body.prix);
  if (price === null) return fail("Le prix fixé est requis.");

  let prixMinimum = null;
  if (text(body.prixMinimum)) {
    prixMinimum = parseAmount(body.prixMinimum);
    if (prixMinimum === null) return fail("Le prix minimum acceptable n'est pas un montant valide.");
    if (prixMinimum > price) {
      return fail("Le prix minimum acceptable ne peut pas dépasser le prix fixé.");
    }
  }

  let modalitePaiement = null;
  let modalitePaiementAutre = null;
  if (body.typeOperation === "RENT") {
    if (!MODALITES_PAIEMENT.includes(body.modalitePaiement)) {
      return fail("Indiquez la modalité de paiement.");
    }
    modalitePaiement = body.modalitePaiement;
    if (modalitePaiement === "AUTRE") {
      modalitePaiementAutre = text(body.modalitePaiementAutre);
      if (!modalitePaiementAutre) return fail("Précisez la modalité de paiement.");
    }
  }

  // --- Composition (obligatoire) ---
  const counts = {};
  for (const [field, label] of Object.entries(COUNT_FIELDS)) {
    const count = parseCount(body[field]);
    if (count === null) return fail(`Indiquez le nombre de ${label} (0 s'il n'y en a pas).`);
    counts[field] = count;
  }

  // --- Responsable du bien ---
  if (!RESPONSABLE_STATUTS.includes(body.responsableStatut)) {
    return fail("Indiquez le statut du responsable du bien.");
  }
  const responsableNom = text(body.responsableNom);
  if (!responsableNom) return fail("Le nom du responsable est requis.");
  const responsablePhone = normalizePhone(body.responsablePhone);
  if (!responsablePhone) return fail("Le téléphone du responsable n'est pas valide.");

  let responsableEmail = null;
  if (text(body.responsableEmail)) {
    const emailCheck = await checkEmail(body.responsableEmail);
    if (!emailCheck.ok) return fail(emailCheck.reason);
    responsableEmail = emailCheck.email;
  } else if (parResponsable) {
    // Le responsable qui remplit lui-même doit pouvoir être recontacté
    // par écrit — c'est aussi là qu'il recevra la confirmation.
    return fail("Votre adresse e-mail est requise.");
  }

  // Obligatoire quand le responsable remplit lui-même : c'est la seule
  // preuve d'identité d'une personne que l'agence n'a jamais rencontrée.
  // Facultative quand un collecteur la relève (« s'il y a possibilité »).
  if (parResponsable && !file) return fail("Annexez votre carte d'identité.");

  if (!DISPONIBILITES_VISITE.includes(body.responsableDisponibiliteVisite)) {
    return fail("Indiquez si le responsable est disponible pour les visites.");
  }
  if (!ACCEPTATIONS_COMMISSION.includes(body.responsableAccepteCommission)) {
    return fail("Indiquez si le responsable accepte la commission de l'agence.");
  }

  // --- Commissionnaire ---
  let collecteurNom = text(body.collecteurNom) || null;
  let collecteurPhone = null;
  let codeCommissionnaire = null;
  if (parCommissionnaire) {
    if (!collecteurNom) return fail("Le nom du commissionnaire est requis.");
    collecteurPhone = normalizePhone(body.collecteurPhone);
    if (!collecteurPhone) return fail("Le téléphone du commissionnaire n'est pas valide.");
    codeCommissionnaire = normalizeCommissionnaireCode(body.codeCommissionnaire);
    if (!codeCommissionnaire) {
      return fail("Le code commissionnaire est requis, au format CCM-042.");
    }
  }
  if (parResponsable) collecteurNom = null;

  return {
    values: {
      parResponsable,
      parCommissionnaire,
      quartier,
      avenue,
      price,
      prixMinimum,
      modalitePaiement,
      modalitePaiementAutre,
      counts,
      responsableNom,
      responsablePhone,
      responsableEmail,
      responsableIdNumber: text(body.responsableIdNumber) || null,
      collecteurNom,
      collecteurPhone,
      codeCommissionnaire,
    },
  };
};

// Route accessible sans compte (un commissionnaire terrain ou un bailleur
// n'en a pas toujours, CLAUDE.md §4) mais jamais indexée côté client. Elle
// crée réellement le bien et son bailleur — et, quand un commissionnaire
// connu l'a collecté, une Mission SOUMISE qui laisse à l'agence la trace et
// le contrôle de ce qui est entré par ce canal.
export const createPropertyCollection = async (req, res, next) => {
  // Validation (DNS de l'e-mail compris) hors transaction : aucune
  // connexion MySQL retenue pendant la vérification.
  const { error: validationError, values } = await validateCollection(req.body, req.file);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  // Écrit avant la transaction (lent, hors connexion MySQL), supprimé si
  // elle échoue ou si la pièce n'est finalement pas retenue.
  let storedDocument = null;
  if (req.file) {
    try {
      storedDocument = await storeIdentityDocument(req.file);
    } catch {
      return res.status(400).json({
        message: "La pièce d'identité n'a pas pu être lue. Envoyez une photo (JPEG, PNG) ou un PDF.",
      });
    }
  }
  let documentAttached = false;

  const { typeMission, typeOperation, propertyType, commune } = req.body;
  const collecteur =
    values.collecteurNom || (values.parResponsable ? null : req.user?.fullName || null);

  const transaction = await db.transaction();
  try {
    // --- Responsable → Person + Bailleur (dédoublonnés par téléphone) ---
    let ownerPerson = await Person.findOne({
      where: { phone: values.responsablePhone },
      transaction,
    });
    if (!ownerPerson) {
      ownerPerson = await Person.create(
        {
          fullName: values.responsableNom,
          phone: values.responsablePhone,
          email: values.responsableEmail,
          idNumber: values.responsableIdNumber,
          ...(storedDocument ?? {}),
        },
        { transaction }
      );
      documentAttached = Boolean(storedDocument);
    } else {
      // Complète une fiche existante sans jamais écraser ce que l'agence
      // a déjà renseigné ou corrigé. Vaut aussi pour la pièce d'identité :
      // cette route est publique, connaître le téléphone d'un bailleur ne
      // doit pas suffire à remplacer son document.
      const missing = {};
      if (!ownerPerson.email && values.responsableEmail) missing.email = values.responsableEmail;
      if (!ownerPerson.idNumber && values.responsableIdNumber) {
        missing.idNumber = values.responsableIdNumber;
      }
      if (!ownerPerson.idDocumentPath && storedDocument) {
        Object.assign(missing, storedDocument);
        documentAttached = true;
      }
      if (Object.keys(missing).length) await ownerPerson.update(missing, { transaction });
    }

    let bailleur = await Bailleur.findOne({
      where: { idPerson: ownerPerson.idPerson },
      transaction,
    });
    const ownerConditions = {
      type: req.body.responsableStatut,
      disponibiliteVisite: req.body.responsableDisponibiliteVisite,
      accepteCommission: req.body.responsableAccepteCommission,
    };
    if (!bailleur) {
      bailleur = await Bailleur.create(
        { idPerson: ownerPerson.idPerson, ...ownerConditions },
        { transaction }
      );
      await bailleur.update(
        {
          dossierNumber: `BAI-${new Date().getFullYear()}-${String(bailleur.idBailleur).padStart(6, "0")}`,
        },
        { transaction }
      );
    } else {
      await bailleur.update(ownerConditions, { transaction });
    }

    // --- Bien ---
    const propertyData = {
      category: typeOperation,
      propertyType,
      commune,
      quartier: values.quartier,
      avenue: values.avenue,
      price: values.price,
      prixMinimum: values.prixMinimum,
      modalitePaiement: values.modalitePaiement,
      modalitePaiementAutre: values.modalitePaiementAutre,
      ...values.counts,
      idBailleur: bailleur.idBailleur,
      codeCommissionnaire: values.codeCommissionnaire,
      informateur: values.parResponsable
        ? `${values.responsableNom} (responsable du bien)`
        : collecteur,
      // Un utilisateur connecté est tracé ; une soumission anonyme reste
      // rattachable via `informateur`/`codeCommissionnaire`.
      createdBy: req.user?.idUser ?? null,
    };
    OPTIONAL_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== "") {
        propertyData[field] = req.body[field];
      }
    });

    const property = await Property.create(propertyData, { transaction });

    // Une collecte terrain ne renseigne pas la durée de location : le
    // mensuel est la modalité de référence du marché local, et reste
    // modifiable ensuite sur la fiche du bien.
    if (typeOperation === "RENT") {
      await RentalProperty.create(
        { idProperty: property.idProperty, unit: req.body.unit || "MONTH" },
        { transaction }
      );
    } else {
      await SaleProperty.create({ idProperty: property.idProperty }, { transaction });
    }

    await PropertyPhone.create(
      { idProperty: property.idProperty, phoneNumber: values.responsablePhone },
      { transaction }
    );

    await recalculatePropertyMargin(property, {
      transaction,
      unit: typeOperation === "RENT" ? req.body.unit || "MONTH" : undefined,
    });

    // --- Mission de traçabilité ---
    // Rattachée au commissionnaire dont le code est fourni, s'il existe
    // réellement — un code inconnu n'invalide jamais la collecte (le bien
    // est déjà en base). Les codes enregistrés avant la normalisation CCM
    // restent retrouvables par leur saisie d'origine.
    let mission = null;
    const commissionnaire = values.codeCommissionnaire
      ? await Commissionnaire.findOne({
          where: {
            code: { [Op.in]: [values.codeCommissionnaire, text(req.body.codeCommissionnaire)] },
          },
          transaction,
        })
      : null;

    if (commissionnaire) {
      mission = await Mission.create(
        {
          uuid: randomUUID(),
          idCommissionnaire: commissionnaire.idCommissionnaire,
          type: typeMission,
          idProperty: property.idProperty,
          notes: [values.collecteurNom, values.collecteurPhone].filter(Boolean).join(" — ") || null,
        },
        { transaction }
      );
    }

    await transaction.commit();

    if (storedDocument && !documentAttached) {
      await deleteIdentityDocument(storedDocument.idDocumentPath);
    }

    const source = values.parResponsable
      ? `Soumis par le responsable (${values.responsableNom})`
      : `Collecté par ${collecteur || "un membre de l'équipe"}${
          values.codeCommissionnaire ? ` (${values.codeCommissionnaire})` : ""
        }`;

    await recordTimelineEvent({
      entityType: "PROPERTY",
      entityId: property.idProperty,
      eventType: "CREATED",
      title: `Bien collecté (${typeOperation === "RENT" ? "à louer" : "à vendre"})`,
      description: [propertyType, commune, values.quartier].filter(Boolean).join(" — "),
      actorUserId: req.user?.idUser ?? null,
      metadata: {
        remplisseur: req.body.remplisseur,
        collecteurNom: values.collecteurNom,
        codeCommissionnaire: values.codeCommissionnaire,
      },
    });

    await createAlert({
      type: "property_collection:new",
      title: `Nouveau bien collecté — ${propertyType} à ${commune}`,
      description: source,
      severite: "INFO",
      relatedEntityType: "Property",
      relatedEntityId: property.idProperty,
      createdBy: req.user?.idUser ?? null,
    });

    return res.status(201).json({
      message: "Bien enregistré avec succès. Merci pour votre collecte.",
      data: {
        idProperty: property.idProperty,
        idMission: mission?.idMission ?? null,
        dossierBailleur: bailleur.dossierNumber,
      },
    });
  } catch (error) {
    await transaction.rollback();
    if (storedDocument) await deleteIdentityDocument(storedDocument.idDocumentPath);
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
