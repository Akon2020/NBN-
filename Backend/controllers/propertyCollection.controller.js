import { randomUUID } from "crypto";
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

// Champs du formulaire de collecte repris tels quels sur `Property` —
// liste explicite (jamais `req.body` propagé en bloc) : ce formulaire est
// atteignable sans authentification, aucun champ non prévu ne doit
// pouvoir être écrit (ni `margin`, ni `statut`, ni `assignedTo`).
const PROPERTY_FIELDS = [
  "propertyType",
  "commune",
  "quartier",
  "avenue",
  "bedrooms",
  "livingRooms",
  "toilets",
  "kitchens",
  "depots",
  "hasElectricity",
  "hasWater",
  "accessibilite",
  "disponibilite",
  "etatBien",
  "observations",
  "description",
  "price",
];

const MISSION_TYPES = ["COLLECTE_BIEN", "APPORT_CLIENT", "SUIVI", "MISE_A_JOUR"];

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

// Les compteurs du formulaire acceptent "1".."10" ou une saisie libre
// ("12", "beaucoup") : seul un entier exploitable est conservé, le reste
// est ignoré silencieusement plutôt que de bloquer la collecte.
const parseCount = (raw) => {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

// Route accessible sans compte (un commissionnaire terrain n'en a pas
// toujours, CLAUDE.md §4) mais jamais indexée côté client. Elle crée
// réellement le bien — et, en parallèle, une Mission SOUMISE qui laisse à
// l'agence la trace et le contrôle de ce qui est entré par ce canal.
export const createPropertyCollection = async (req, res, next) => {
  const transaction = await db.transaction();
  try {
    const {
      typeMission,
      typeOperation,
      propertyType,
      prix,
      proprietaireNom,
      proprietairePhone,
      proprietaireDisponibiliteVisite,
      proprietaireAccepteCommission,
      collecteurNom,
      collecteurPhone,
      codeCommissionnaire,
      commune,
    } = req.body;

    if (!typeMission || !MISSION_TYPES.includes(typeMission)) {
      await transaction.rollback();
      return res.status(400).json({ message: "Le type de mission est requis." });
    }
    if (!typeOperation || !["RENT", "SALE"].includes(typeOperation)) {
      await transaction.rollback();
      return res.status(400).json({ message: "Le type d'opération (location/vente) est requis." });
    }
    if (!propertyType) {
      await transaction.rollback();
      return res.status(400).json({ message: "Le type de bien est requis." });
    }
    if (!commune) {
      await transaction.rollback();
      return res.status(400).json({ message: "La commune est requise." });
    }
    if (!proprietaireNom || !proprietairePhone) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "Le nom et le téléphone du propriétaire sont requis." });
    }
    if (!collecteurNom) {
      await transaction.rollback();
      return res.status(400).json({ message: "Le nom du collecteur est requis." });
    }

    const price = parseAmount(prix);
    if (price === null) {
      await transaction.rollback();
      return res.status(400).json({ message: "Le prix fixé est requis." });
    }

    // --- Propriétaire → Person + Bailleur (dédoublonnés par téléphone) ---
    const ownerPhone = String(proprietairePhone).trim();
    let ownerPerson = await Person.findOne({ where: { phone: ownerPhone }, transaction });
    if (!ownerPerson) {
      ownerPerson = await Person.create(
        { fullName: String(proprietaireNom).trim(), phone: ownerPhone },
        { transaction }
      );
    }

    let bailleur = await Bailleur.findOne({ where: { idPerson: ownerPerson.idPerson }, transaction });
    const ownerConditions = {
      disponibiliteVisite: proprietaireDisponibiliteVisite || null,
      accepteCommission: proprietaireAccepteCommission || null,
    };
    if (!bailleur) {
      bailleur = await Bailleur.create(
        { idPerson: ownerPerson.idPerson, type: "PROPRIETAIRE", ...ownerConditions },
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
      price,
      idBailleur: bailleur.idBailleur,
      codeCommissionnaire: codeCommissionnaire || null,
      informateur: collecteurNom ? String(collecteurNom).trim() : null,
      // Un utilisateur connecté est tracé ; une soumission anonyme reste
      // rattachable via `informateur`/`codeCommissionnaire`.
      createdBy: req.user?.idUser ?? null,
    };
    PROPERTY_FIELDS.forEach((field) => {
      if (req.body[field] === undefined || req.body[field] === "") return;
      if (["bedrooms", "livingRooms", "toilets", "kitchens", "depots"].includes(field)) {
        const count = parseCount(req.body[field]);
        if (count !== null) propertyData[field] = count;
        return;
      }
      if (field === "price") return; // déjà normalisé ci-dessus
      propertyData[field] = req.body[field];
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
      { idProperty: property.idProperty, phoneNumber: ownerPhone },
      { transaction }
    );

    await recalculatePropertyMargin(property, {
      transaction,
      unit: typeOperation === "RENT" ? req.body.unit || "MONTH" : undefined,
    });

    // --- Mission de traçabilité ---
    // Rattachée au commissionnaire dont le code est fourni, s'il existe
    // réellement — un code inconnu n'invalide jamais la collecte (le bien
    // est déjà en base), il laisse simplement la mission non rattachée.
    let mission = null;
    const commissionnaire = codeCommissionnaire
      ? await Commissionnaire.findOne({ where: { code: codeCommissionnaire }, transaction })
      : null;

    if (commissionnaire) {
      mission = await Mission.create(
        {
          uuid: randomUUID(),
          idCommissionnaire: commissionnaire.idCommissionnaire,
          type: typeMission,
          idProperty: property.idProperty,
          notes: [collecteurNom, collecteurPhone].filter(Boolean).join(" — ") || null,
        },
        { transaction }
      );
    }

    await transaction.commit();

    await recordTimelineEvent({
      entityType: "PROPERTY",
      entityId: property.idProperty,
      eventType: "CREATED",
      title: `Bien collecté sur le terrain (${typeOperation === "RENT" ? "à louer" : "à vendre"})`,
      description: [propertyType, commune, property.quartier].filter(Boolean).join(" — "),
      actorUserId: req.user?.idUser ?? null,
      metadata: { collecteurNom, codeCommissionnaire: codeCommissionnaire || null },
    });

    await createAlert({
      type: "property_collection:new",
      title: `Nouveau bien collecté — ${propertyType} à ${commune}`,
      description: `Collecté par ${collecteurNom}${codeCommissionnaire ? ` (${codeCommissionnaire})` : ""}`,
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
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
