/**
 * Création (ou promotion) du premier compte administrateur.
 *
 *   npm run admin:create -- "Nom Complet" admin@nbnexpress.org "MotDePasse1!"
 *
 * Si le compte existe déjà, il est promu `admin`, réactivé si nécessaire, et
 * son mot de passe est réinitialisé avec la valeur fournie. Dans ce cas les
 * sessions ouvertes sont révoquées et `securityVersion` est incrémenté, comme
 * pour tout changement de mot de passe (CLAUDE.md §5) — sans quoi un jeton
 * volé resterait valable après la reprise en main du compte.
 *
 * Le script s'appuie sur les migrations pour le schéma : il ne synchronise
 * jamais les modèles lui-même (CLAUDE.md §13). Lancer `npm run db:migrate`
 * avant, si la base est neuve.
 */
import bcrypt from "bcryptjs";
import db from "../database/db.js";
import { User } from "../models/index.model.js";
import { DEFAULT_PASSWD } from "../config/env.js";
import { strongPasswd, valideEmail } from "../utils/user.utils.js";
import { revokeAllUserSessions } from "../utils/session.utils.js";

const USAGE = `Usage : npm run admin:create -- "Nom Complet" email@domaine.org "MotDePasse1!"`;

/** Termine proprement : la connexion Sequelize maintient le process en vie. */
const quit = async (code, message) => {
  if (message) console[code === 0 ? "log" : "error"](message);
  try {
    await db.close();
  } catch {
    // La fermeture n'a pas abouti (connexion jamais ouverte) : sans effet
    // sur le résultat de l'opération, qui est déjà déterminé.
  }
  process.exit(code);
};

const [fullName, email, password] = process.argv.slice(2);

if (!fullName || !email || !password) {
  console.error(USAGE);
  process.exit(1);
}

if (!valideEmail(email)) {
  console.error("Adresse e-mail invalide.");
  process.exit(1);
}

if (!strongPasswd(password)) {
  console.error(
    "Mot de passe trop faible : 6 caractères minimum, avec au moins une lettre, un chiffre et un caractère spécial.",
  );
  process.exit(1);
}

// Le mot de passe par défaut est refusé : `login` le détecte et bloque la
// connexion en exigeant un changement (auth.controller.js), ce qui créerait
// un compte admin inutilisable.
if (password === DEFAULT_PASSWD) {
  console.error(
    "Ce mot de passe est celui attribué par défaut aux nouveaux comptes : la connexion serait refusée tant qu'il n'est pas changé. Choisissez-en un autre.",
  );
  process.exit(1);
}

try {
  await db.authenticate();
} catch (error) {
  console.error(`Connexion à la base impossible : ${error.message}`);
  process.exit(1);
}

try {
  const normalizedEmail = email.trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt());

  const existing = await User.findOne({ where: { email: normalizedEmail } });

  if (existing) {
    await existing.update({
      fullName: fullName.trim(),
      role: "admin",
      status: "ACTIVE",
      password: hashedPassword,
      securityVersion: existing.securityVersion + 1,
    });
    await revokeAllUserSessions(existing.idUser, "admin_revoke");

    await quit(
      0,
      `Compte administrateur mis à jour : ${normalizedEmail}\n` +
        `  Rôle promu en « admin », compte actif, mot de passe réinitialisé.\n` +
        `  Les sessions ouvertes de ce compte ont été déconnectées.`,
    );
  }

  const admin = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: "admin",
    status: "ACTIVE",
  });

  await quit(
    0,
    `Compte administrateur créé : ${normalizedEmail} (id ${admin.idUser})\n` +
      `  Connectez-vous sur le dashboard avec le mot de passe fourni.`,
  );
} catch (error) {
  await quit(1, `Échec de la création du compte : ${error.message}`);
}
