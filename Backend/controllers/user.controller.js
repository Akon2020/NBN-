import { User, Session } from "../models/index.model.js";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import { DEFAULT_PASSWD, EMAIL, FRONT_URL } from "../config/env.js";
import {
  getUserWithoutPassword,
  strongPasswd,
  valideEmail,
} from "../utils/user.utils.js";
import { newUserEmailTemplate } from "../utils/email.template.js";
import transporter from "../config/nodemailer.js";
import { deleteFile } from "../utils/deletefile.js";
import { revokeAllUserSessions } from "../utils/session.utils.js";
import { invalidateSecurityVersion } from "../utils/securityVersionCache.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll();
    const usersWithoutPassword = users.map(getUserWithoutPassword);
    return res.status(200).json({
      nombre: usersWithoutPassword.length,
      usersInfo: usersWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 11 — annuaire minimal (nom/rôle uniquement, jamais email/statut/
// avatar) pour les sélecteurs d'assignation (participants de calendrier,
// etc.) : n'importe quel utilisateur authentifié peut voir les noms de ses
// collègues, contrairement à `getAllUsers` (données complètes, réservé à
// `users:read`).
export const getUsersDirectory = async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: { status: "ACTIVE" },
      attributes: ["idUser", "fullName", "role"],
      order: [["fullName", "ASC"]],
    });
    return res.status(200).json({ nombre: users.length, data: users });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getSingleUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res
        .status(400)
        .json({ message: "Cet utilisateur n'existe pas dans notre système" });
    }
    const userWithoutPassword = getUserWithoutPassword(user);
    return res.status(200).json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const getUserByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User non trouvé" });
    }
    const userWithoutPassword = getUserWithoutPassword(user);
    return res.status(200).json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { fullName, email, role } = req.body;
    const avatar = req.file ? req.file.path : null;

    if (!fullName || !email) {
      return res.status(400).json({
        message: "Nom complet, et l'email sont requis",
      });
    }

    if (!valideEmail(email)) {
      return res
        .status(401)
        .json({ message: "Entrez une adresse mail valide" });
    }

    const userExist = await User.findOne({ where: { email } });

    if (userExist) {
      return res.status(400).json({
        message: "Cet utilisateur a déjà un compte",
      });
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWD, salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role,
      avatar,
      createdAt: new Date(),
    });

    let mailEnvoye = true;
    try {
      const mailOptions = {
        from: `"Nyumbani Express" <${EMAIL}>`,
        to: email,
        subject: "Bienvenue dans Nyumbani Express",
        html: newUserEmailTemplate(fullName, email, DEFAULT_PASSWD, FRONT_URL),
      };
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.error("Erreur lors de l'envoi du mail :", mailError.message);
      mailEnvoye = false;
    }

    const userWithoutPassword = getUserWithoutPassword(newUser);

    return res.status(201).json({
      message: `L'utilisateur ${fullName} a été créé avec succès`,
      emailStatus: mailEnvoye
        ? "E-mail de bienvenue envoyé"
        : "L'utilisateur a été enregistré, mais le mail de bienvenue n'a pas pu être envoyé",
      data: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User non trouvé" });
    }

    const champsModifiables = ["fullName", "email", "role", "status"];
    const donneesAMettreAJour = {};

    champsModifiables.forEach((champ) => {
      if (req.body[champ] !== undefined) {
        donneesAMettreAJour[champ] = req.body[champ];
      }
    });

    if (req.file) {
      if (user.avatar) {
        await deleteFile(user.avatar);
      }
      donneesAMettreAJour.avatar = req.file.path;
    }

    const passageEnInactif =
      donneesAMettreAJour.status === "INACTIVE" && user.status !== "INACTIVE";

    if (passageEnInactif) {
      // CLAUDE.md §5 : suspension/exclusion -> révocation immédiate de
      // toutes les sessions actives + incrément de securityVersion (double
      // mécanisme, cohérent l'un avec l'autre).
      donneesAMettreAJour.securityVersion = user.securityVersion + 1;
    }

    const utilisateurModifie = await user.update(donneesAMettreAJour);

    if (passageEnInactif) {
      await revokeAllUserSessions(user.idUser, "account_suspended");
      invalidateSecurityVersion(user.idUser);
    }

    const safeUser = getUserWithoutPassword(utilisateurModifie);

    return res.status(200).json({
      message: `Les données de l'utilisateur ${user.fullName} ont été modifiées avec succès`,
      data: safeUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 16 — l'ancien mot de passe requis en fait de facto un changement en
// libre-service (jamais un reset admin) ; l'absence de vérification
// explicite d'identité laissait n'importe quel titulaire de JWT valide
// tenter ce endpoint sur l'idUser d'un tiers (seule la connaissance de
// l'ancien mot de passe de la cible protégeait réellement). Corrigé en
// n'autorisant que le propriétaire du compte — un admin qui veut réinitialiser
// le mot de passe d'un tiers utilise `resetUserPassword` ci-dessous, qui ne
// requiert pas l'ancien mot de passe et journalise l'action différemment.
export const updateUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (String(req.user.idUser) !== String(id)) {
      return res.status(403).json({
        message: "Vous ne pouvez modifier que votre propre mot de passe.",
      });
    }

    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    if (!strongPasswd(newPassword)) {
      return res.status(401).json({
        message:
          "Le mot de passe doit être de 6 caractères au mininum et doit contenir au moins:\n- 1 lettre\n-1 chiffre\n- 1 symbole",
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res
        .status(400)
        .json({ message: "Les nouveaux mots de passe ne correspondent pas" });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        message: "Choisissez un nouveau mot de passe différent de l'ancien",
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User non trouvé" });
    }

    const passwordCorrect = await bcrypt.compare(oldPassword, user.password);

    if (!passwordCorrect) {
      return res.status(401).json({ message: "Ancien mot de passe incorrect" });
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // CLAUDE.md §5 — un changement de mot de passe est un événement de
    // révocation au même titre qu'une suspension : double mécanisme
    // (sessions révoquées + securityVersion incrémenté), toutes les
    // sessions actives (y compris l'appareil courant) devront se
    // reconnecter.
    await user.update({
      password: hashedPassword,
      securityVersion: user.securityVersion + 1,
    });
    await revokeAllUserSessions(user.idUser, "password_changed");
    invalidateSecurityVersion(user.idUser);

    return res
      .status(200)
      .json({ message: "Mot de passe mis à jour avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 16 — réinitialisation par un administrateur (users:manage) : ne
// requiert pas l'ancien mot de passe, contrairement à `updateUserPassword`
// ci-dessus qui reste strictement un changement en libre-service.
export const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "newPassword est requis" });
    }

    if (!strongPasswd(newPassword)) {
      return res.status(401).json({
        message:
          "Le mot de passe doit être de 6 caractères au mininum et doit contenir au moins:\n- 1 lettre\n-1 chiffre\n- 1 symbole",
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User non trouvé" });
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await user.update({
      password: hashedPassword,
      securityVersion: user.securityVersion + 1,
    });
    await revokeAllUserSessions(user.idUser, "admin_revoke");
    invalidateSecurityVersion(user.idUser);

    return res.status(200).json({
      message: `Mot de passe de ${user.fullName} réinitialisé avec succès. Toutes ses sessions actives ont été déconnectées.`,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 16 — visibilité admin sur les sessions actives d'un utilisateur
// (CLAUDE.md §5 décrit l'entité Session à cette fin, jamais consommée
// jusqu'ici par une route dédiée). Ne renvoie jamais `refreshTokenHash`.
export const getUserSessions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User non trouvé" });
    }

    const sessions = await Session.findAll({
      where: { idUser: id, revokedAt: null, expiresAt: { [Op.gt]: new Date() } },
      attributes: [
        "idSession",
        "platform",
        "deviceLabel",
        "lastActiveAt",
        "createdAt",
        "expiresAt",
      ],
      order: [["lastActiveAt", "DESC"]],
    });

    return res.status(200).json({ nombre: sessions.length, data: sessions });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

// GOAL 16 — "déconnecter toutes les sessions" côté admin, même mécanisme
// que la suspension et que `logout-all` en libre-service, mais déclenché
// sur un tiers (raison d'audit distincte : "admin_revoke").
export const revokeUserSessions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User non trouvé" });
    }

    await user.update({ securityVersion: user.securityVersion + 1 });
    await revokeAllUserSessions(user.idUser, "admin_revoke");
    invalidateSecurityVersion(user.idUser);

    return res.status(200).json({
      message: `Toutes les sessions actives de ${user.fullName} ont été révoquées.`,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const userExist = await User.findByPk(id);

    if (!userExist) {
      return res
        .status(404)
        .json({ message: "Cet utilisateur n'exite pas dans notre système" });
    }

    if (userExist) {
      await deleteFile(userExist.avatar);
    }

    await userExist.destroy();

    return res.status(200).json({
      message: `L'utilisateur ${userExist.fullName} a été supprimé avec succès`,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
