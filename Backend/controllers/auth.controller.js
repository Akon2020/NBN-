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

export const register = async (req, res, next) => {
  try {
    const { fullName, email, password, role } = req.body;
    const avatar = req.file ? req.file.path : null;

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
      role: role || "agent",
      avatar,
      status: "ACTIVE",
    });
    const token = generateToken({ id: newUser, email });

    const mailOptions = {
      from: `"Nyumbani Express" <${EMAIL}>`,
      to: email,
      subject: "Bienvenue dans Nyumbani Express",
      html: welcomeEmailTemplate(fullName, email, FRONT_URL),
    };

    await transporter.sendMail(mailOptions);

    const userWithoutPassword = getUserWithoutPassword(newUser);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
    });

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      data: { token, user: userWithoutPassword },
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

    const loginToken = generateToken(user);
    res.cookie("token", loginToken, {
      httpOnly: true,
      secure: true,
    });

    const userWithoutPassword = getUserWithoutPassword(user);

    res.status(200).json({
      message: `Bienvenu ${userWithoutPassword.fullName}`,
      data: { token: loginToken, userInfo: userWithoutPassword },
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

    await User.update(
      { password: hashedPassword },
      { where: { idUser: user.idUser } }
    );

    res.status(200).json({
      message:
        "Mot de passe réinitialisé avec succès! Connectez-vous maintenant",
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Déconnexion réussie",
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
    next(error);
  }
};
