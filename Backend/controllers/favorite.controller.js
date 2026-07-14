import { Favorite, Property } from "../models/index.model.js";

export const getMyFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.findAll({
      where: { idUser: req.user.idUser },
      include: [{ model: Property }],
    });
    return res.status(200).json({ nombre: favorites.length, data: favorites });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const addFavorite = async (req, res, next) => {
  try {
    const { idProperty } = req.body;
    if (!idProperty) {
      return res.status(400).json({ message: "idProperty est requis." });
    }

    const property = await Property.findByPk(idProperty);
    if (!property) {
      return res.status(404).json({ message: "Propriété non trouvée" });
    }

    const [favorite, created] = await Favorite.findOrCreate({
      where: { idUser: req.user.idUser, idProperty },
    });

    return res.status(created ? 201 : 200).json({
      message: created ? "Ajouté aux favoris" : "Déjà dans les favoris",
      data: favorite,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const removeFavorite = async (req, res, next) => {
  try {
    const { idProperty } = req.params;
    const deleted = await Favorite.destroy({
      where: { idUser: req.user.idUser, idProperty },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Favori non trouvé" });
    }

    return res.status(200).json({ message: "Retiré des favoris" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
