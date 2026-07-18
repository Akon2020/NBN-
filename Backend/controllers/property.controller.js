import {
  Property,
  RentalProperty,
  SaleProperty,
  PropertyImage,
  PropertyVideo,
  PropertyPhone,
  PropertyScore,
  Matching,
  MarginHistory,
} from "../models/index.model.js";
import db from "../database/db.js";
import {
  serializeProperties,
  serializeProperty,
} from "../utils/serializers/property.serializer.js";
import { createArchiveHandlers } from "../utils/archivable.js";
import { recordTimelineEvent } from "../shared/timeline.js";
import { deleteFile } from "../utils/deletefile.js";
import { compressImageInPlace } from "../utils/imageCompression.js";
import { recalculatePropertyMargin } from "../shared/marginCalculator.js";

const PROPERTY_INCLUDES = [
  { model: RentalProperty, as: "rentalDetails" },
  { model: SaleProperty, as: "saleDetails" },
  { model: PropertyImage, as: "images", separate: true, order: [["order", "ASC"]] },
  { model: PropertyVideo, as: "videos", separate: true, order: [["order", "ASC"]] },
  { model: PropertyPhone, as: "phones" },
  { model: PropertyScore, as: "scores" },
];

// MOBILE-G03 — le "client final" du CDC n'a pas de compte User (une Person
// devient Client/Bailleur, jamais un User, CLAUDE.md §4) : lecture publique
// volontairement restreinte aux biens DISPONIBLE, avec le même filtrage
// field-level qu'un appelant sans permission (`serializeProperty(..., null)`
// masque toujours `margin`, jamais de contournement possible ici).
export const getPublicProperties = async (req, res, next) => {
  try {
    const properties = await Property.findAll({
      where: { statut: "DISPONIBLE" },
      include: PROPERTY_INCLUDES,
    });
    const propertiesInfo = await serializeProperties(properties, null);
    return res.status(200).json({
      nombre: propertiesInfo.length,
      propertiesInfo,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getPublicProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await Property.findOne({
      where: { idProperty: id, statut: "DISPONIBLE" },
      include: PROPERTY_INCLUDES,
    });
    if (!property) {
      return res.status(404).json({ message: "Propriété non trouvée" });
    }
    const serialized = await serializeProperty(property, null);
    return res.status(200).json(serialized);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// BACK-G21 — les biens archivés (archivage métier) restent en base et
// consultables mais se désencombrent des listes actives par défaut ;
// `?includeArchived=true` les réintègre explicitement (jamais confondu
// avec `deletedAt`, exclu automatiquement par Sequelize en mode paranoid).
export const getAllProperties = async (req, res, next) => {
  try {
    const where = req.query.includeArchived === "true" ? {} : { archivedAt: null };
    const properties = await Property.findAll({ where, include: PROPERTY_INCLUDES });
    const propertiesInfo = await serializeProperties(properties, req.user);
    return res.status(200).json({
      nombre: propertiesInfo.length,
      propertiesInfo,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// BACK-G05 : recréé proprement maintenant que `statut` existe réellement
// sur le modèle (le filtre cassé avait dû être retiré en SEC-G04).
export const getPropertiesByStatut = async (req, res, next) => {
  try {
    const { statut } = req.params;
    const properties = await Property.findAll({
      where: { statut },
      include: PROPERTY_INCLUDES,
    });
    const propertiesInfo = await serializeProperties(properties, req.user);
    return res.status(200).json({
      nombre: propertiesInfo.length,
      propertiesInfo,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getSingleProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await Property.findByPk(id, { include: PROPERTY_INCLUDES });
    if (!property) {
      return res.status(404).json({ message: "Propriété non trouvée" });
    }
    const serialized = await serializeProperty(property, req.user);
    return res.status(200).json(serialized);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 1 — `statut` n'est délibérément pas dans cette liste : tout
// changement de statut passe par `updatePropertyStatut` (validation des
// transitions + journalisation timeline), jamais par la mise à jour
// générique des champs.
// GOAL 9 — `margin` et `marginOverridePercentage` n'y sont pas non plus :
// `margin` est une valeur dérivée (jamais saisie directement), et
// l'override passe par `updatePropertyMarginOverride` (seul point d'entrée
// audité, même patron que le statut).
const PROPERTY_FIELDS = [
  "propertyType",
  "quartier",
  "avenue",
  "fullAddress",
  "floors",
  "bedrooms",
  "livingRooms",
  "toilets",
  "kitchens",
  "price",
  "codeCommissionnaire",
  "informateur",
  "idBailleur",
  "latitude",
  "longitude",
  "description",
];

export const createProperty = async (req, res, next) => {
  const transaction = await db.transaction();
  try {
    const { category, guarantee, unit, phones } = req.body;

    if (!category || !["RENT", "SALE"].includes(category)) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "category (RENT ou SALE) est requis." });
    }
    if (!req.body.propertyType) {
      await transaction.rollback();
      return res.status(400).json({ message: "propertyType est requis." });
    }

    const propertyData = { category, createdBy: req.user.idUser };
    PROPERTY_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        propertyData[field] = req.body[field];
      }
    });

    const property = await Property.create(propertyData, { transaction });

    if (category === "RENT") {
      if (!unit) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ message: "unit (DAY/MONTH/YEAR) est requis pour un bien à louer." });
      }
      await RentalProperty.create(
        { idProperty: property.idProperty, guarantee, unit },
        { transaction }
      );
    } else {
      await SaleProperty.create({ idProperty: property.idProperty }, { transaction });
    }

    if (Array.isArray(phones) && phones.length) {
      await PropertyPhone.bulkCreate(
        phones.map((phoneNumber) => ({ idProperty: property.idProperty, phoneNumber })),
        { transaction }
      );
    }

    // GOAL 9 — `margin` est toujours dérivée, calculée dès la création à
    // partir du prix et du pourcentage effectif de son type (aucun override
    // possible à la création, cf. updatePropertyMarginOverride).
    // GOAL 12 — `unit` transmis explicitement (déjà connu ici) pour éviter
    // une requête RentalProperty superflue dans resolveStayType.
    await recalculatePropertyMargin(property, { transaction, unit: category === "RENT" ? unit : undefined });

    await transaction.commit();

    await recordTimelineEvent({
      entityType: "PROPERTY",
      entityId: property.idProperty,
      eventType: "CREATED",
      title: `Bien créé (${category === "RENT" ? "à louer" : "à vendre"})`,
      description: [property.propertyType, property.quartier].filter(Boolean).join(" — "),
      actorUserId: req.user.idUser,
    });

    const created = await Property.findByPk(property.idProperty, {
      include: PROPERTY_INCLUDES,
    });
    const serialized = await serializeProperty(created, req.user);
    return res.status(201).json({
      message: "Propriété créée avec succès",
      data: serialized,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateProperty = async (req, res, next) => {
  const transaction = await db.transaction();
  try {
    const { id } = req.params;
    const property = await Property.findByPk(id, { transaction });
    if (!property) {
      await transaction.rollback();
      return res.status(404).json({ message: "Propriété non trouvée" });
    }

    const propertyData = {};
    PROPERTY_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        propertyData[field] = req.body[field];
      }
    });
    await property.update(propertyData, { transaction });

    if (property.category === "RENT" && (req.body.guarantee !== undefined || req.body.unit !== undefined)) {
      const rentalData = {};
      if (req.body.guarantee !== undefined) rentalData.guarantee = req.body.guarantee;
      if (req.body.unit !== undefined) rentalData.unit = req.body.unit;
      await RentalProperty.update(rentalData, {
        where: { idProperty: id },
        transaction,
      });
    }

    // GOAL 9 — un changement de prix doit toujours se refléter dans la
    // marge dérivée, override ou pas (l'override porte sur le pourcentage,
    // jamais sur le montant final).
    // GOAL 12 — un changement d'`unit` seul (ex. passage longue durée →
    // courte durée) doit aussi redéclencher le calcul : le pourcentage
    // effectif en dépend désormais, même si le prix n'a pas bougé.
    // RentalProperty étant déjà à jour ci-dessus, `resolveStayType` lit la
    // bonne valeur sans avoir besoin qu'on la lui passe explicitement.
    if (req.body.price !== undefined || req.body.unit !== undefined) {
      await recalculatePropertyMargin(property, { transaction });
    }

    await transaction.commit();

    const updated = await Property.findByPk(id, { include: PROPERTY_INCLUDES });
    const serialized = await serializeProperty(updated, req.user);
    return res.status(200).json({ message: "Propriété mise à jour", data: serialized });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

const PROPERTY_STATUTS = [
  "DISPONIBLE",
  "OCCUPE_CLIENT_NBN",
  "OCCUPE_CLIENT_EXTERNE",
  "EN_MAINTENANCE",
  "VENDU",
];

// GOAL 1 — seul point d'entrée pour changer le statut d'un bien (jamais via
// `updateProperty`), afin que chaque transition soit à la fois validée
// (VENDU réservé aux biens SALE) et journalisée dans la timeline (GOAL 3).
export const updatePropertyStatut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { statut, note } = req.body;

    if (!PROPERTY_STATUTS.includes(statut)) {
      return res.status(400).json({
        message: `statut doit être l'un de : ${PROPERTY_STATUTS.join(", ")}.`,
      });
    }

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: "Propriété non trouvée" });
    }

    if (statut === "VENDU" && property.category !== "SALE") {
      return res.status(400).json({
        message: "Le statut VENDU n'est applicable qu'aux biens à vendre (category=SALE).",
      });
    }

    if (property.statut === statut) {
      return res.status(400).json({ message: "Ce bien a déjà ce statut." });
    }

    const previousStatut = property.statut;
    await property.update({ statut });

    await recordTimelineEvent({
      entityType: "PROPERTY",
      entityId: property.idProperty,
      eventType: "STATUS_CHANGED",
      title: `Statut : ${previousStatut} → ${statut}`,
      description: note || null,
      metadata: { automatic: false },
      actorUserId: req.user.idUser,
    });

    // GOAL 8 — "sortie" côté client (vue 360), symétrique de l'"entrée"
    // journalisée dans client.controller.js au moment de l'occupation.
    if (previousStatut === "OCCUPE_CLIENT_NBN" && statut !== "OCCUPE_CLIENT_NBN") {
      const validatedMatchings = await Matching.findAll({
        where: { idProperty: property.idProperty, statut: "VALIDE" },
      });
      for (const matching of validatedMatchings) {
        await recordTimelineEvent({
          entityType: "CLIENT",
          entityId: matching.idClient,
          eventType: "SORTIE",
          title: `Sortie du bien — ${[property.avenue, property.quartier].filter(Boolean).join(", ")}`,
          description: note || null,
          metadata: { idProperty: property.idProperty },
          actorUserId: req.user.idUser,
        });
      }
    }

    const updated = await Property.findByPk(id, { include: PROPERTY_INCLUDES });
    const serialized = await serializeProperty(updated, req.user);
    return res.status(200).json({ message: "Statut mis à jour", data: serialized });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 9 — seul point d'entrée pour changer l'override de marge d'un bien
// (jamais via `updateProperty`) : garantit la validation du pourcentage et
// la journalisation (MarginHistory + timeline du bien), même patron que
// `updatePropertyStatut`. `percentage: null` retire l'override et fait
// retomber le bien sur le pourcentage global de son type.
export const updatePropertyMarginOverride = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { percentage } = req.body;

    if (percentage !== null && percentage !== undefined) {
      const numeric = Number(percentage);
      if (Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
        return res.status(400).json({ message: "percentage doit être un nombre entre 0 et 100, ou null." });
      }
    }

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: "Propriété non trouvée" });
    }

    const normalized = percentage === undefined ? null : percentage;
    const previousPercentage = property.marginOverridePercentage;
    if (Number(previousPercentage ?? NaN) === Number(normalized ?? NaN)) {
      return res.status(400).json({ message: "Ce bien a déjà cet override de marge." });
    }

    await property.update({ marginOverridePercentage: normalized });
    await recalculatePropertyMargin(property);

    await MarginHistory.create({
      scope: "PROPERTY",
      idProperty: property.idProperty,
      previousPercentage,
      newPercentage: normalized,
      actorUserId: req.user.idUser,
    });

    await recordTimelineEvent({
      entityType: "PROPERTY",
      entityId: property.idProperty,
      eventType: "MARGIN_OVERRIDE_CHANGED",
      title:
        normalized === null
          ? "Override de marge retiré (retour au défaut du type)"
          : `Override de marge : ${normalized}%`,
      actorUserId: req.user.idUser,
    });

    const updated = await Property.findByPk(id, { include: PROPERTY_INCLUDES });
    const serialized = await serializeProperty(updated, req.user);
    return res.status(200).json({ message: "Override de marge mis à jour", data: serialized });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// Upload découplé de la création (CLAUDE.md §8 — même principe côté web
// qu'offline mobile : un échec d'image ne doit jamais invalider le bien).
// GOAL 2 — chaque image est recompressée (sharp) avant d'être enregistrée ;
// un échec de compression n'empêche jamais l'ajout (voir imageCompression.js).
export const addPropertyImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: "Propriété non trouvée" });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "Aucune image fournie." });
    }

    await Promise.all(files.map((file) => compressImageInPlace(file.path)));

    const maxOrder = (await PropertyImage.max("order", { where: { idProperty: id } })) || 0;
    const images = await PropertyImage.bulkCreate(
      files.map((file, index) => ({
        idProperty: id,
        image: file.path,
        order: maxOrder + index + 1,
      }))
    );

    await recordTimelineEvent({
      entityType: "PROPERTY",
      entityId: Number(id),
      eventType: "MEDIA_ADDED",
      title: `${images.length} image(s) ajoutée(s)`,
      actorUserId: req.user.idUser,
    });

    return res.status(201).json({ message: "Images ajoutées avec succès", data: images });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const deletePropertyImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    const image = await PropertyImage.findOne({ where: { idPropertyImage: imageId, idProperty: id } });
    if (!image) {
      return res.status(404).json({ message: "Image non trouvée" });
    }

    await deleteFile(image.image);
    await image.destroy();

    await recordTimelineEvent({
      entityType: "PROPERTY",
      entityId: Number(id),
      eventType: "MEDIA_REMOVED",
      title: "Image supprimée",
      actorUserId: req.user.idUser,
    });

    return res.status(200).json({ message: "Image supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 2 — réorganisation : `orderedIds` est la liste complète des
// idPropertyImage du bien dans le nouvel ordre voulu, jamais un delta —
// plus simple et sans ambiguïté côté client (un simple drag terminé
// renvoie l'état final de la liste).
export const reorderPropertyImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || !orderedIds.length) {
      return res.status(400).json({ message: "orderedIds (tableau) est requis." });
    }

    await Promise.all(
      orderedIds.map((imageId, index) =>
        PropertyImage.update(
          { order: index },
          { where: { idPropertyImage: imageId, idProperty: id } }
        )
      )
    );

    const images = await PropertyImage.findAll({ where: { idProperty: id }, order: [["order", "ASC"]] });
    return res.status(200).json({ message: "Ordre mis à jour", data: images });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 2 — vidéo jamais recompressée côté serveur (coût CPU disproportionné
// sur un hébergement mono-process, cf. upload.middleware.js) : seule la
// validation de format/taille protège cet endpoint.
export const addPropertyVideos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: "Propriété non trouvée" });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "Aucune vidéo fournie." });
    }

    const maxOrder = (await PropertyVideo.max("order", { where: { idProperty: id } })) || 0;
    const videos = await PropertyVideo.bulkCreate(
      files.map((file, index) => ({
        idProperty: id,
        video: file.path,
        order: maxOrder + index + 1,
      }))
    );

    await recordTimelineEvent({
      entityType: "PROPERTY",
      entityId: Number(id),
      eventType: "MEDIA_ADDED",
      title: `${videos.length} vidéo(s) ajoutée(s)`,
      actorUserId: req.user.idUser,
    });

    return res.status(201).json({ message: "Vidéos ajoutées avec succès", data: videos });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const deletePropertyVideo = async (req, res, next) => {
  try {
    const { id, videoId } = req.params;
    const video = await PropertyVideo.findOne({ where: { idPropertyVideo: videoId, idProperty: id } });
    if (!video) {
      return res.status(404).json({ message: "Vidéo non trouvée" });
    }

    await deleteFile(video.video);
    await video.destroy();

    await recordTimelineEvent({
      entityType: "PROPERTY",
      entityId: Number(id),
      eventType: "MEDIA_REMOVED",
      title: "Vidéo supprimée",
      actorUserId: req.user.idUser,
    });

    return res.status(200).json({ message: "Vidéo supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const reorderPropertyVideos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || !orderedIds.length) {
      return res.status(400).json({ message: "orderedIds (tableau) est requis." });
    }

    await Promise.all(
      orderedIds.map((videoId, index) =>
        PropertyVideo.update(
          { order: index },
          { where: { idPropertyVideo: videoId, idProperty: id } }
        )
      )
    );

    const videos = await PropertyVideo.findAll({ where: { idProperty: id }, order: [["order", "ASC"]] });
    return res.status(200).json({ message: "Ordre mis à jour", data: videos });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// BACK-G21 — soft delete (paranoid) uniquement : `property.destroy()` pose
// désormais `deletedAt` au lieu de supprimer la ligne (CLAUDE.md §11,
// "réversible à court terme"). Les lignes enfants (images/téléphones/
// scores/détails location-vente) ne sont plus supprimées en cascade ici —
// une restauration doit rendre un bien intact, pas une coquille vide.
// La suppression définitive des fichiers physiques et des lignes enfants
// reste hors-scope V1 (rétention légale, CLAUDE.md §16 point 3).
export const deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: "Propriété non trouvée" });
    }

    await property.destroy();

    return res.status(200).json({
      message: "Propriété supprimée avec succès",
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const restoreProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await Property.findByPk(id, { paranoid: false });
    if (!property) {
      return res.status(404).json({ message: "Propriété non trouvée" });
    }
    if (!property.deletedAt) {
      return res.status(400).json({ message: "Ce bien n'est pas supprimé" });
    }

    await property.restore();
    return res.status(200).json({ message: "Propriété restaurée avec succès", data: property });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const { archiveResource: archiveProperty, unarchiveResource: unarchiveProperty } =
  createArchiveHandlers(Property, "idProperty", "Propriété non trouvée");
