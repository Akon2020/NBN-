import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { User } from "../models/index.model.js";
import { getUserWithoutPassword } from "../utils/user.utils.js";

export const authMiddlware = async (req, res, next) => {
  let token = null;

  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Authentification requise : Jeton manquant." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.email) {
      return res
        .status(401)
        .json({ message: "Jeton invalide : Email utilisateur manquant." });
    }

    const user = await User.findOne({
      where: { email: decoded.email },
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res
        .status(401)
        .json({ message: "Utilisateur non trouvé ou compte désactivé." });
    }

    if (user.status === "INACTIVE") {
      return res
        .status(401)
        .json({ message: "Ce compte a été désactivé." });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Jeton expiré. Veuillez vous reconnecter." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Jeton invalide." });
    }
    return res
      .status(500)
      .json({ message: "Erreur serveur lors de l'authentification." });
  }
};

/**
 * Garde de rôle minimale (SEC-G02).
 * Version provisoire avant le RBAC complet (Role/Permission/AccessGrant) du Milestone 1 :
 * ne vérifie qu'une liste de rôles autorisés, doit être appelée après authMiddlware.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Authentification requise." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Accès refusé : permissions insuffisantes." });
    }

    next();
  };
};

export const checkAuthStatus = (req, res) => {
  try {
    if (req.user) {
      const userWithoutPassword = getUserWithoutPassword(req.user);
      return res.status(200).json({
        authenticated: true,
        user: userWithoutPassword,
      });
    } else {
      return res.status(200).json({
        authenticated: false,
        message: "Aucun utilisateur authentifié.",
      });
    }
  } catch (error) {
    console.error(
      "Erreur lors de la vérification du statut d'authentification:",
      error
    );
    return res.status(500).json({ message: "Erreur serveur." });
  }
};
