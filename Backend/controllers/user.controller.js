import { User } from "../models/index.model.js";
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

    const userExist = await User.findOne({
      where: {
        [Op.or]: [{ fullName }, { email }],
      },
    });

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

    const champsModifiables = ["fullName", "email", "role"];
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

    const utilisateurModifie = await user.update(donneesAMettreAJour);

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

export const updateUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
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

    await User.update(
      { password: hashedPassword },
      { where: { idUtilisateur: id } }
    );

    return res
      .status(200)
      .json({ message: "Mot de passe mis à jour avec succès" });
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
