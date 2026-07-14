import { User } from "../models/index.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  DEFAULT_PASSWD,
  EMAIL,
  FRONT_URL,
  HOST_URL,
  JWT_SECRET,
} from "../config/env.js";
import transporter from "../config/nodemailer.js";
import {
  resetPasswordEmailTemplate,
  welcomeEmailTemplate,
} from "../utils/email.template.js";
import {
  generateToken,
  getUserWithoutPassword,
  strongPasswd,
  valideEmail,
} from "../utils/user.utils.js";
import {
  generateAccessToken,
  createSession,
  rotateSession,
  revokeSession,
  revokeTokenFamily,
  revokeAllUserSessions,
  hashToken,
} from "../utils/session.utils.js";
import { invalidateSecurityVersion } from "../utils/securityVersionCache.js";
import { Session } from "../models/index.model.js";

const ACCESS_COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: "strict" };
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/api/auth",
};

const ALLOWED_PLATFORMS = ["web", "ios", "android"];

const resolvePlatform = (platform) =>
  ALLOWED_PLATFORMS.includes(platform) ? platform : "web";

/**
 * Émet un access token + une nouvelle session (refresh token), pose les
 * cookies web et renvoie les deux jetons dans le corps de la réponse (pour
 * le Mobile, qui les stocke lui-même via expo-secure-store et ne peut pas
 * compter sur des cookies inter-app).
 */
const issueTokens = async (res, user, req) => {
  const accessToken = generateAccessToken(user);
  const { refreshToken, session } = await createSession({
    idUser: user.idUser,
    platform: resolvePlatform(req.body.platform),
    userAgent: req.headers["user-agent"],
  });

  res.cookie("token", accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie("refreshToken", refreshToken, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: session.expiresAt.getTime() - Date.now(),
  });

  return { accessToken, refreshToken };
};

export const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;
    const avatar = req.file ? req.file.path : null;
    // SEC-G02 : l'auto-inscription publique ne doit jamais permettre de
    // s'attribuer un rôle privilégié (ex. admin). Les rôles privilégiés ne
    // sont attribuables que par un admin via POST /api/users/add (protégé).
    const role = "agent";

    if (!email || !password || !fullName) {
      return res
        .status(400)
        .json({ message: "Vous devez renseigner tout les champs!" });
    }

    if (!valideEmail(email)) {
      return res
        .status(401)
        .json({ message: "Entrez une adresse mail valide" });
    }

    if (!strongPasswd(password)) {
      return res.status(401).json({
        message:
          "Le mot de passe doit être de 6 caractères au mininum et doit contenir au moins:\n- 1 lettre\n-1 chiffre\n- 1 symbole",
      });
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res
        .status(400)
        .json({ message: "Cet utilisateur a déjà un compte" });
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role,
      avatar,
      status: "ACTIVE",
    });

    const mailOptions = {
      from: `"Nyumbani Express" <${EMAIL}>`,
      to: email,
      subject: "Bienvenue dans Nyumbani Express",
      html: welcomeEmailTemplate(fullName, email, FRONT_URL),
    };

    await transporter.sendMail(mailOptions);

    const { accessToken, refreshToken } = await issueTokens(res, newUser, req);
    const userWithoutPassword = getUserWithoutPassword(newUser);

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      data: { token: accessToken, refreshToken, user: userWithoutPassword },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    if (user.status === "INACTIVE") {
      return res.status(401).json({ message: "Ce compte a été désactivé." });
    }

    const isDefaultPassword = await bcrypt.compare(
      DEFAULT_PASSWD,
      user.password
    );

    if (isDefaultPassword) {
      return res.status(403).json({
        message:
          "Vous utilisez le mot de passe par défaut. Veuillez le modifier pour continuer.",
        requiresPasswordChange: true,
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken, refreshToken } = await issueTokens(res, user, req);
    const userWithoutPassword = getUserWithoutPassword(user);

    res.status(200).json({
      message: `Bienvenu ${userWithoutPassword.fullName}`,
      data: { token: accessToken, refreshToken, userInfo: userWithoutPassword },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

/**
 * BACK-G01 — Rotation du refresh token. Détecte la réutilisation d'un
 * refresh token déjà révoqué et révoque alors toute la famille de tokens
 * (CLAUDE.md §5).
 */
export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Refresh token manquant." });
    }

    const session = await Session.findOne({
      where: { refreshTokenHash: hashToken(token) },
    });

    if (!session) {
      return res.status(401).json({ message: "Refresh token invalide." });
    }

    if (session.revokedAt) {
      // Réutilisation d'un token déjà révoqué : compromission possible,
      // toute la famille est révoquée et une reconnexion est forcée.
      await revokeTokenFamily(session.tokenFamilyId, "reuse_detected");
      res.clearCookie("token", ACCESS_COOKIE_OPTIONS);
      res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
      return res.status(401).json({
        message:
          "Session invalide détectée. Toutes vos sessions ont été déconnectées, veuillez vous reconnecter.",
      });
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await revokeSession(session, "expired");
      return res
        .status(401)
        .json({ message: "Refresh token expiré. Veuillez vous reconnecter." });
    }

    const user = await User.findByPk(session.idUser);
    if (!user || user.status === "INACTIVE") {
      return res.status(401).json({ message: "Compte indisponible." });
    }

    const { refreshToken: newRefreshToken, session: newSession } =
      await rotateSession(session, { userAgent: req.headers["user-agent"] });

    const accessToken = generateAccessToken(user);

    res.cookie("token", accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("refreshToken", newRefreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: newSession.expiresAt.getTime() - Date.now(),
    });

    res.status(200).json({
      message: "Jeton rafraîchi",
      data: { token: accessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "L'email est requis" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({
        message:
          "Cet email n'est attaché à aucun compte! Veuillez vérifier votre email",
      });
    }
    const resetToken = generateToken(user);
    const mailOptions = {
      from: `"Nyumbani Express" <${EMAIL}>`,
      to: email,
      subject: "Réinitialisation du mot de passe",
      html: resetPasswordEmailTemplate(
        user.fullName,
        email,
        HOST_URL,
        resetToken
      ),
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({
      message:
        "Un email de réinitialisation vous a été envoyé! Consultez votre boîte mail",
      dev: {
        resetUrl: `${HOST_URL}/auth/resetpassword?token=${resetToken}`,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { token } = req.query;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token et nouveau mot de passe requis" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.email) {
      return res.status(400).json({ message: "Token invalide ou expiré" });
    }

    const user = await User.findOne({ where: { email: decoded.email } });
    if (!user) {
      return res.status(404).json({ message: "User non trouvé" });
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Un changement de mot de passe invalide toutes les sessions actives.
    await User.update(
      {
        password: hashedPassword,
        securityVersion: user.securityVersion + 1,
      },
      { where: { idUser: user.idUser } }
    );
    await revokeAllUserSessions(user.idUser, "admin_revoke");
    invalidateSecurityVersion(user.idUser);

    res.status(200).json({
      message:
        "Mot de passe réinitialisé avec succès! Connectez-vous maintenant",
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (token) {
      const session = await Session.findOne({
        where: { refreshTokenHash: hashToken(token) },
      });
      if (session && !session.revokedAt) {
        await revokeSession(session, "logout");
      }
    }

    res.clearCookie("token", ACCESS_COOKIE_OPTIONS);
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Déconnexion réussie",
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

/**
 * BACK-G01 — Déconnecte toutes les sessions de l'utilisateur courant
 * (tous appareils) et invalide immédiatement tout access token déjà émis
 * via l'incrément de securityVersion.
 */
export const logoutAll = async (req, res, next) => {
  try {
    const user = req.user;

    await User.update(
      { securityVersion: user.securityVersion + 1 },
      { where: { idUser: user.idUser } }
    );
    await revokeAllUserSessions(user.idUser, "logout_all");
    invalidateSecurityVersion(user.idUser);

    res.clearCookie("token", ACCESS_COOKIE_OPTIONS);
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Déconnecté de toutes les sessions",
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
