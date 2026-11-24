import { User } from "../models/index.model.js";
import bcrypt from "bcryptjs";
import {
  DEFAULT_PASSWD,
  FRONT_URL,
} from "../config/env.js";
import { sendMail } from "../config/nodemailer.js";
import { welcomeEmailTemplate } from "../utils/email.template.js";
import {
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
  accessTokenMaxAge,
} from "../utils/session.utils.js";
import { invalidateSecurityVersion } from "../utils/securityVersionCache.js";
import { Session, AuthToken } from "../models/index.model.js";
import {
  consumeAuthToken,
  issueAuthToken,
  normalizeAccessKey,
  TOKEN_REFUSAL_MESSAGES,
} from "../utils/authTokens.js";
import { passwordResetEmail } from "../utils/accountEmail.templates.js";
import { queueEmail } from "../services/email.service.js";

// Le site (nbnexpress.org) et l'API (api.nbnexpress.org) sont sur le même
// site : `Lax` suffit et reste accepté par Safari iOS après une navigation
// venue d'un lien externe (e-mail, WhatsApp), là où `Strict` peut retenir
// le cookie. Réglable par COOKIE_SAME_SITE (lax, strict ou none).
const SAME_SITE = ["lax", "strict", "none"].includes(String(process.env.COOKIE_SAME_SITE).toLowerCase())
  ? String(process.env.COOKIE_SAME_SITE).toLowerCase()
  : "lax";
const ACCESS_COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: SAME_SITE };
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: SAME_SITE,
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

  res.cookie("token", accessToken, {
    ...ACCESS_COOKIE_OPTIONS,
    maxAge: accessTokenMaxAge(accessToken),
  });
  res.cookie("refreshToken", refreshToken, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: session.expiresAt.getTime() - Date.now(),
  });

  return { accessToken, refreshToken };
};

// Outil interne : les comptes sont créés par un administrateur (Utilisateurs)
// ou par l'activation d'une clé d'accès. L'inscription libre reste ouverte
// hors production (tests, démonstration), ou si ALLOW_PUBLIC_REGISTRATION=true.
const publicRegistrationAllowed = () =>
  process.env.ALLOW_PUBLIC_REGISTRATION === "true" || process.env.NODE_ENV !== "production";

export const register = async (req, res, next) => {
  try {
    if (!publicRegistrationAllowed()) {
      return res.status(403).json({
        message: "Les comptes sont créés par l'administrateur de l'agence. Contactez-le pour obtenir un accès.",
      });
    }
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

    // Le compte est déjà créé à ce stade : un SMTP injoignable ne doit
    // jamais transformer une inscription réussie en erreur 500 côté
    // client (le mail de bienvenue est informatif, pas une étape du
    // workflow). Même traitement que `user.controller.js::createUser`.
    let mailEnvoye = true;
    try {
      await sendMail({
        to: email,
        subject: "Bienvenue dans Nyumbani Express",
        html: welcomeEmailTemplate(fullName, email, FRONT_URL),
      });
    } catch (mailError) {
      console.error(
        "Erreur lors de l'envoi du mail de bienvenue :",
        mailError.message,
      );
      mailEnvoye = false;
    }

    const { accessToken, refreshToken } = await issueTokens(res, newUser, req);
    const userWithoutPassword = getUserWithoutPassword(newUser);

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      emailStatus: mailEnvoye
        ? "E-mail de bienvenue envoyé"
        : "Compte créé, mais le mail de bienvenue n'a pas pu être envoyé",
      data: { token: accessToken, refreshToken, user: userWithoutPassword },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { password } = req.body;
    // Les claviers mobiles (iOS en tête) ajoutent volontiers une majuscule
    // initiale ou une espace après une suggestion : la même adresse doit
    // ouvrir le même compte, quelle que soit la façon dont elle a été tapée.
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const user = email ? await User.findOne({ where: { email } }) : null;
    if (!user || !password || !(await bcrypt.compare(password, user.password))) {
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
      // Le mot de passe par défaut prouve l'identité une seule fois : un
      // jeton court permet de choisir son propre mot de passe tout de suite,
      // sans session ouverte d'ici là.
      const { token } = await issueAuthToken({ idUser: user.idUser, purpose: "PASSWORD_SETUP" });
      return res.status(403).json({
        message:
          "Vous utilisez le mot de passe par défaut. Choisissez votre propre mot de passe pour continuer.",
        requiresPasswordChange: true,
        setupToken: token,
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

    res.cookie("token", accessToken, {
      ...ACCESS_COOKIE_OPTIONS,
      maxAge: accessTokenMaxAge(accessToken),
    });
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

const passwordRule =
  "Le mot de passe doit contenir au moins 8 caractères, dont une lettre, un chiffre et un symbole.";

const isAcceptablePassword = (password) =>
  typeof password === "string" && password.length >= 8 && strongPasswd(password);

const frontUrl = () => (FRONT_URL || "https://nbnexpress.org").replace(/\/+$/, "");

/**
 * « Mot de passe oublié » : la réponse est toujours la même, que l'adresse
 * existe ou non (aucune énumération des comptes), et le lien ne figure
 * jamais dans la réponse HTTP. Il part par e-mail (file d'envoi), vaut
 * 15 minutes, sert une seule fois et remplace tout lien précédent.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!email || !valideEmail(email)) {
      return res.status(400).json({ message: "Entrez une adresse e-mail valide." });
    }

    const user = await User.findOne({ where: { email } });
    if (user && user.status !== "INACTIVE") {
      const { token } = await issueAuthToken({ idUser: user.idUser, purpose: "PASSWORD_RESET" });
      const link = `${frontUrl()}/auth/reset-password?token=${token}`;
      const mail = passwordResetEmail({
        fullName: user.fullName,
        link,
        minutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES || 15),
      });
      await queueEmail({ to: user.email, ...mail });
    }

    return res.status(200).json({
      message:
        "Si un compte correspond à cette adresse, un lien de réinitialisation valable 15 minutes vient d'y être envoyé.",
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

/**
 * Vérifie un lien ou une clé sans le consommer, pour que la page de
 * définition du mot de passe affiche le compte concerné.
 */
export const checkAuthToken = async (req, res, next) => {
  try {
    const raw = req.body?.token;
    const candidates = [String(raw ?? "").trim(), normalizeAccessKey(raw)].filter(Boolean);
    const token = candidates.length
      ? await AuthToken.findOne({
          where: { tokenHash: candidates.map(hashToken) },
          include: [{ model: User, attributes: ["email", "fullName", "status"] }],
        })
      : null;
    let reason = null;
    if (!token || !token.user || token.user.status === "INACTIVE") reason = "invalid";
    else if (token.usedAt) reason = "used";
    else if (token.revokedAt) reason = "revoked";
    else if (token.expiresAt.getTime() < Date.now()) reason = "expired";
    if (reason) return res.status(400).json({ valid: false, reason, message: TOKEN_REFUSAL_MESSAGES[reason] });

    return res.status(200).json({
      valid: true,
      purpose: token.purpose,
      email: token.user.email,
      fullName: token.user.fullName,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

/**
 * Définit le mot de passe à partir d'un lien ou d'une clé à usage unique.
 * - Réinitialisation : toutes les sessions sont fermées, l'utilisateur se
 *   reconnecte ensuite avec son nouveau mot de passe.
 * - Clé d'accès / premier mot de passe : la clé prouve l'identité, la
 *   session est ouverte directement pour une première connexion fluide.
 */
export const updatePassword = async (req, res, next) => {
  try {
    const raw = req.body?.token || req.query?.token;
    const { newPassword } = req.body ?? {};

    if (!raw || !newPassword) {
      return res.status(400).json({ message: "Le lien et le nouveau mot de passe sont requis." });
    }
    if (!isAcceptablePassword(newPassword)) {
      return res.status(400).json({ message: passwordRule });
    }
    if (DEFAULT_PASSWD && newPassword === DEFAULT_PASSWD) {
      return res.status(400).json({ message: "Choisissez un mot de passe différent du mot de passe par défaut." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt());
    const outcome = await consumeAuthToken(
      raw,
      ["PASSWORD_RESET", "PASSWORD_SETUP", "ACCESS_KEY"],
      async (token, transaction) => {
        const user = await User.findByPk(token.idUser, { transaction, lock: transaction.LOCK.UPDATE });
        if (!user || user.status === "INACTIVE") return null;
        user.password = hashedPassword;
        user.securityVersion = user.securityVersion + 1;
        await user.save({ transaction });
        // Les autres liens encore valides de ce compte tombent aussi.
        await AuthToken.update(
          { revokedAt: new Date() },
          { where: { idUser: user.idUser, usedAt: null, revokedAt: null }, transaction },
        );
        return user;
      },
    );

    if (!outcome.ok || !outcome.result) {
      const reason = outcome.ok ? "invalid" : outcome.reason;
      return res.status(400).json({ reason, message: TOKEN_REFUSAL_MESSAGES[reason] });
    }

    const user = outcome.result;
    await revokeAllUserSessions(user.idUser, "password_changed");
    invalidateSecurityVersion(user.idUser);

    if (outcome.token.purpose === "PASSWORD_RESET") {
      return res.status(200).json({
        message: "Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.",
        signedIn: false,
      });
    }

    user.lastLoginAt = new Date();
    await user.save();
    const { accessToken, refreshToken } = await issueTokens(res, user, req);
    return res.status(200).json({
      message: "Mot de passe enregistré. Bienvenue !",
      signedIn: true,
      data: { token: accessToken, refreshToken, userInfo: getUserWithoutPassword(user) },
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
