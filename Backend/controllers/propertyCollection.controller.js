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
  normalizeCollecteurCode,
  normalizeCommissionnaireCode,
  normalizePhone,
} from "../utils/contactValidation.js";
import { KIND_OF_TYPE } from "../shared/propertyKinds.js";
import { deleteIdentityDocument, storeIdentityDocument } from "../utils/identityDocuments.js";
import { notifyPropertyCollection } from "../services/formNotifications.service.js";

const MISSION_TYPES = ["COLLECTE_BIEN", "APPORT_CLIENT", "SUIVI", "MISE_A_JOUR"];
// Liste unique de l'agence, plus les anciens types encore envoyés par
// l'application mobile hors ligne (rattachés au même type affiché).
const PROPERTY_TYPES = Object.keys(KIND_OF_TYPE);
const COMMUNES = ["IBANDA", "KADUTU", "BAGIRA"];

// Qui remplit le formulaire : le responsable du bien lui-même, un
// collecteur (code CTR) ou un commissionnaire (code CMR).
const REMPLISSEURS = ["RESPONSABLE", "COLLECTEUR", "COMMISSIONNAIRE"];
// Un code suspendu ou exclu n'est plus accepté.
const ACTIVE_AGENT_STATUTS = ["ACTIF", "OBSERVATION"];

// Fiche terrain active correspondant à un code CMR ou CTR.
export const findActiveFieldAgent = async (code, profil) => {
  if (!code) return null;
  const agent = await Commissionnaire.findOne({
    where: { code, profil },
    include: [{ model: Person, as: "person" }],
  });
  return agent && ACTIVE_AGENT_STATUTS.includes(agent.statut) ? agent : null;
};
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

// Relevés d'état/accès restés facultatifs, repris tels quels - liste
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
// Fiche terrain liée au compte connecté (commissionnaire ou collecteur).
const findAgentOfUser = async (user) => {
  const person = await Person.findOne({ where: { idUser: user.idUser } });
  return person ? Commissionnaire.findOne({ where: { idPerson: person.idPerson } }) : null;
};

const validateCollection = async (body, file, user = null) => {
  const fail = (error) => ({ error });

  if (!REMPLISSEURS.includes(body.remplisseur)) {
    return fail("Indiquez qui remplit ce formulaire : le responsable du bien, un collecteur ou un commissionnaire.");
  }
  const parResponsable = body.remplisseur === "RESPONSABLE";

  // Code du collecteur (CTR) ou du commissionnaire (CMR) qui remplit,
  // vérifié en base. Un membre de l'équipe connecté peut collecter sans
  // code ; un commissionnaire connecté ne peut utiliser que le sien.
  let remplisseurAgent = null;
  const ownAgent = user ? await findAgentOfUser(user) : null;
  if (body.remplisseur === "COLLECTEUR") {
    const code = normalizeCollecteurCode(body.codeCollecteur);
    if (code) {
      remplisseurAgent = await findActiveFieldAgent(code, "COLLECTEUR");
      if (!remplisseurAgent) return fail(`Le code collecteur ${code} n'existe pas ou n'est plus actif.`);
    } else if (!user || ownAgent) {
      return fail("Le code collecteur est requis, au format CTR-007.");
    }
  }
  if (body.remplisseur === "COMMISSIONNAIRE") {
    const code = ownAgent?.profil === "COMMISSIONNAIRE" ? ownAgent.code : normalizeCommissionnaireCode(body.codeRemplisseur ?? body.codeCommissionnaire);
    if (!code) return fail("Votre code commissionnaire est requis, au format CMR-042.");
    remplisseurAgent = await findActiveFieldAgent(code, "COMMISSIONNAIRE");
    if (!remplisseurAgent) return fail(`Le code commissionnaire ${code} n'existe pas ou n'est plus actif.`);
  }
  if (ownAgent && remplisseurAgent && ownAgent.idCommissionnaire !== remplisseurAgent.idCommissionnaire) {
    return fail("Utilisez votre propre code pour enregistrer un bien.");
  }

  // « Ce bien a-t-il été apporté par un commissionnaire ? » : implicite
  // quand le commissionnaire remplit lui-même, demandé sinon.
  let parCommissionnaire = body.remplisseur === "COMMISSIONNAIRE";
  if (!parCommissionnaire) {
    if (typeof body.parCommissionnaire !== "boolean") {
      return fail("Indiquez si ce bien a été apporté par un commissionnaire.");
    }
    parCommissionnaire = body.parCommissionnaire;
  }

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

  // E-mail du responsable toujours requis : c'est par là que l'agence le
  // recontacte par écrit (et qu'il reçoit la confirmation s'il remplit).
  if (!text(body.responsableEmail)) {
    return fail(parResponsable ? "Votre adresse e-mail est requise." : "L'adresse e-mail du responsable est requise.");
  }
  const emailCheck = await checkEmail(body.responsableEmail);
  if (!emailCheck.ok) return fail(emailCheck.reason);
  const responsableEmail = emailCheck.email;

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

  // --- Commissionnaire qui a apporté le bien ---
  // Nom et téléphone viennent toujours de sa fiche, jamais de la saisie.
  let commissionnaireAgent = body.remplisseur === "COMMISSIONNAIRE" ? remplisseurAgent : null;
  if (parCommissionnaire && !commissionnaireAgent) {
    const code = normalizeCommissionnaireCode(body.codeCommissionnaire);
    if (!code) return fail("Le code du commissionnaire est requis, au format CMR-042.");
    commissionnaireAgent = await findActiveFieldAgent(code, "COMMISSIONNAIRE");
    if (!commissionnaireAgent) return fail(`Le code commissionnaire ${code} n'existe pas ou n'est plus actif.`);
  }

  const collecteurNom = parResponsable
    ? null
    : remplisseurAgent?.person?.fullName || text(body.collecteurNom) || user?.fullName || null;

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
      collecteurPhone: remplisseurAgent?.person?.phone || null,
      codeCollecteur: body.remplisseur === "COLLECTEUR" ? remplisseurAgent?.code ?? null : null,
      codeCommissionnaire: commissionnaireAgent?.code ?? null,
      remplisseurAgent,
      commissionnaireAgent,
    },
  };
};

// Route accessible sans compte (un commissionnaire terrain ou un bailleur
// n'en a pas toujours, CLAUDE.md §4) mais jamais indexée côté client. Elle
// crée réellement le bien et son bailleur - et, quand un commissionnaire
// connu l'a collecté, une Mission SOUMISE qui laisse à l'agence la trace et
// le contrôle de ce qui est entré par ce canal.
export const createPropertyCollection = async (req, res, next) => {
  // Validation (DNS de l'e-mail compris) hors transaction : aucune
  // connexion MySQL retenue pendant la vérification.
  const { error: validationError, values } = await validateCollection(req.body, req.file, req.user ?? null);
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
      codeCollecteur: values.codeCollecteur,
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
    // réellement - un code inconnu n'invalide jamais la collecte (le bien
    // est déjà en base). Les codes enregistrés avant la normalisation CCM
    // restent retrouvables par leur saisie d'origine.
    let mission = null;
    // La mission de traçabilité va au commissionnaire qui a apporté le
    // bien, sinon au collecteur qui l'a relevé.
    const commissionnaire = values.commissionnaireAgent || values.remplisseurAgent;

    if (commissionnaire) {
      mission = await Mission.create(
        {
          uuid: randomUUID(),
          idCommissionnaire: commissionnaire.idCommissionnaire,
          type: typeMission,
          idProperty: property.idProperty,
          notes: [values.collecteurNom, values.collecteurPhone].filter(Boolean).join(" - ") || null,
        },
        { transaction }
      );
    }

    await transaction.commit();

    if (storedDocument && !documentAttached) {
      await deleteIdentityDocument(storedDocument.idDocumentPath);
    }

    const source = values.parResponsable
      ? `Soumis par le responsable (${values.responsableNom})${
          values.codeCommissionnaire ? `, apporté par ${values.commissionnaireAgent.person?.fullName} (${values.codeCommissionnaire})` : ""
        }`
      : `Collecté par ${collecteur || "un membre de l'équipe"}${
          values.codeCollecteur ? ` (${values.codeCollecteur})` : ""
        }${values.codeCommissionnaire ? `, commissionnaire ${values.codeCommissionnaire}` : ""}`;

    await recordTimelineEvent({
      entityType: "PROPERTY",
      entityId: property.idProperty,
      eventType: "CREATED",
      title: `Bien collecté (${typeOperation === "RENT" ? "à louer" : "à vendre"})`,
      description: [propertyType, commune, values.quartier].filter(Boolean).join(" - "),
      actorUserId: req.user?.idUser ?? null,
      metadata: {
        remplisseur: req.body.remplisseur,
        collecteurNom: values.collecteurNom,
        codeCollecteur: values.codeCollecteur,
        codeCommissionnaire: values.codeCommissionnaire,
      },
    });

    await createAlert({
      type: "property_collection:new",
      title: `Nouveau bien collecté - ${propertyType} à ${commune}`,
      description: source,
      severite: "INFO",
      relatedEntityType: "Property",
      relatedEntityId: property.idProperty,
      createdBy: req.user?.idUser ?? null,
    });

    // Équipe prévenue sur le site et par e-mail ; confirmation au
    // responsable qui a enregistré son bien lui-même. Jamais bloquant.
    try {
      await notifyPropertyCollection({
        property,
        responsable: {
          fullName: values.responsableNom,
          phone: values.responsablePhone,
          email: values.responsableEmail,
        },
        source,
        parResponsable: values.parResponsable,
        // Le commissionnaire (ou collecteur) dont le code a été saisi est
        // prévenu s'il a un compte.
        fieldAgents: [values.commissionnaireAgent, values.remplisseurAgent].filter(Boolean),
      });
    } catch (notifyError) {
      console.error("Notification de la collecte de bien :", notifyError.message);
    }

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

const maskPhone = (phone) => (phone ? `${"*".repeat(Math.max(phone.length - 3, 0))}${phone.slice(-3)}` : null);

// Vérification d'un code saisi dans le formulaire (CMR ou CTR), pour
// afficher le nom et le téléphone de la fiche avant l'envoi.
export const lookupFieldAgent = async (req, res, next) => {
  try {
    const raw = String(req.params.code ?? "");
    const profil = /^ctr/i.test(raw.trim()) ? "COLLECTEUR" : "COMMISSIONNAIRE";
    const code = profil === "COLLECTEUR" ? normalizeCollecteurCode(raw) : normalizeCommissionnaireCode(raw);
    if (!code) return res.status(400).json({ message: "Format attendu : CMR-042 ou CTR-007." });

    const agent = await findActiveFieldAgent(code, profil);
    if (!agent) return res.status(404).json({ message: `Le code ${code} n'existe pas ou n'est plus actif.` });

    const phone = agent.person?.phone ?? null;
    return res.status(200).json({
      data: {
        code: agent.code,
        profil: agent.profil,
        fullName: agent.person?.fullName ?? null,
        phone: req.user ? phone : maskPhone(phone),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
