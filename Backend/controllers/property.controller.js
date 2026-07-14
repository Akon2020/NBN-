import {
  Property,
  RentalProperty,
  SaleProperty,
  PropertyImage,
  PropertyPhone,
  PropertyScore,
} from "../models/index.model.js";
import { deleteFile } from "../utils/deletefile.js";
import db from "../database/db.js";
import {
  serializeProperties,
  serializeProperty,
} from "../utils/serializers/property.serializer.js";

const PROPERTY_INCLUDES = [
  { model: RentalProperty, as: "rentalDetails" },
  { model: SaleProperty, as: "saleDetails" },
  { model: PropertyImage, as: "images" },
  { model: PropertyPhone, as: "phones" },
  { model: PropertyScore, as: "scores" },
];

export const getAllProperties = async (req, res, next) => {
  try {
    const properties = await Property.findAll({ include: PROPERTY_INCLUDES });
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
  "margin",
  "statut",
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

    await transaction.commit();

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

// Upload découplé de la création (CLAUDE.md §8 — même principe côté web
// qu'offline mobile : un échec d'image ne doit jamais invalider le bien).
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

    const images = await PropertyImage.bulkCreate(
      files.map((file) => ({ idProperty: id, image: file.path }))
    );

    return res.status(201).json({ message: "Images ajoutées avec succès", data: images });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const deleteProperty = async (req, res, next) => {
  const transaction = await db.transaction();

  try {
    const { id } = req.params;

    const property = await Property.findByPk(id, {
      include: [
        { model: PropertyImage, as: "images" },
        { model: PropertyPhone, as: "phones" },
        { model: PropertyScore, as: "scores" },
      ],
      transaction,
    });

    if (!property) {
      await transaction.rollback();
      return res.status(404).json({ message: "Propriété non trouvée" });
    }

    if (property.images?.length) {
      for (const image of property.images) {
        await deleteFile(image.path);
      }
    }

    await PropertyImage.destroy({
      where: { idProperty: id },
      transaction,
    });

    await PropertyPhone.destroy({
      where: { idProperty: id },
      transaction,
    });

    await PropertyScore.destroy({
      where: { idProperty: id },
      transaction,
    });

    await RentalProperty.destroy({ where: { idProperty: id }, transaction });
    await SaleProperty.destroy({ where: { idProperty: id }, transaction });

    // 4️⃣ Supprimer la propriété
    await property.destroy({ transaction });

    // 5️⃣ Commit
    await transaction.commit();

    return res.status(200).json({
      message: "Propriété supprimée avec succès",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erreur suppression propriété :", error);
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
