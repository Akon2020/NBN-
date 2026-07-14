import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { User } from "../models/index.model.js";
import { getUserWithoutPassword } from "../utils/user.utils.js";
import { getSecurityVersion } from "../utils/securityVersionCache.js";

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
      return res.status(401).json({ message: "Ce compte a été désactivé." });
    }

    // BACK-G01 : un jeton dont la securityVersion ne correspond plus à
    // celle du compte (suspension, déconnexion globale, changement de mot
    // de passe) est rejeté même s'il n'est pas cryptographiquement expiré.
    // Lu depuis un cache in-process (~60s) pour éviter un aller-retour DB
    // dédié à chaque requête.
    const currentSecurityVersion = await getSecurityVersion(user.idUser);
    if (
      currentSecurityVersion === null ||
      decoded.securityVersion !== currentSecurityVersion
    ) {
      return res.status(401).json({
        message: "Session invalidée. Veuillez vous reconnecter.",
      });
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
