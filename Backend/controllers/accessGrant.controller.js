import { AccessGrant, User, Permission } from "../models/index.model.js";

export const getAllAccessGrants = async (_req, res, next) => {
  try {
    const grants = await AccessGrant.findAll({
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ nombre: grants.length, data: grants });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createAccessGrant = async (req, res, next) => {
  try {
    const { idUser, permissionKey, reason, expiresAt } = req.body;

    if (!idUser || !permissionKey || !reason) {
      return res.status(400).json({
        message: "idUser, permissionKey et reason sont obligatoires.",
      });
    }

    const targetUser = await User.findByPk(idUser);
    if (!targetUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const permission = await Permission.findOne({
      where: { key: permissionKey },
    });
    if (!permission) {
      return res.status(400).json({ message: "Permission inconnue." });
    }

    const grant = await AccessGrant.create({
      idUser,
      permissionKey,
      grantedBy: req.user.idUser,
      reason,
      expiresAt: expiresAt || null,
    });

    return res.status(201).json({
      message: "Accès accordé avec succès",
      data: grant,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const revokeAccessGrant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const grant = await AccessGrant.findByPk(id);

    if (!grant) {
      return res.status(404).json({ message: "Accès non trouvé." });
    }

    if (grant.revokedAt) {
      return res.status(400).json({ message: "Cet accès est déjà révoqué." });
    }

    grant.revokedAt = new Date();
    grant.revokedBy = req.user.idUser;
    await grant.save();

    return res.status(200).json({ message: "Accès révoqué avec succès", data: grant });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
