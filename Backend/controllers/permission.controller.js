import { Permission } from "../models/index.model.js";

export const getAllPermissions = async (_req, res, next) => {
  try {
    const permissions = await Permission.findAll({ order: [["key", "ASC"]] });
    return res.status(200).json({ nombre: permissions.length, data: permissions });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
