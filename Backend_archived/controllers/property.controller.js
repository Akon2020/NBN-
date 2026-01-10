import {
  Property,
  PropertyImage,
  PropertyPhone,
  PropertyScore,
} from "../models/index.model.js";
import { Op } from "sequelize";
import { deleteFile } from "../utils/deletefile.js";
import db from "../database/db.js";

export const getAllProperties = async (_, res, next) => {
  try {
    const properties = await Property.findAll();
    return res.status(200).json({
      nombre: properties.length,
      propertiesInfo: properties,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
export const getSingleProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await Property.findByPk(id, {
      include: [
        {
          model: PropertyImage,
          as: "images",
        },
        {
          model: PropertyPhone,
          as: "phones",
        },
        {
          model: PropertyScore,
          as: "scores",
        },
      ],
    });
    if (!property) {
      return res.status(404).json({ message: "Propriété non trouvée" });
    }
    return res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getPropertiesByStatut = async (req, res, next) => {
  try {
    const { statut } = req.params;
    const properties = await Property.findAll({
      where: { statut },
      include: [
        {
          model: PropertyImage,
          as: "images",
        },
        {
          model: PropertyPhone,
          as: "phones",
        },
        {
          model: PropertyScore,
          as: "scores",
        },
      ],
    });
    return res.status(200).json({
      nombre: properties.length,
      propertiesInfo: properties,
    });
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
      where: { propertyId: id },
      transaction,
    });

    await PropertyPhone.destroy({
      where: { propertyId: id },
      transaction,
    });

    await PropertyScore.destroy({
      where: { propertyId: id },
      transaction,
    });

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