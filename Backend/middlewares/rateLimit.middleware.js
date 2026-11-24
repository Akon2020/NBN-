import rateLimit from "express-rate-limit";

const minutes = (value) => value * 60 * 1000;
const envNumber = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

// SEC-G07 : freine le brute-force sans dépendance externe (store en
// mémoire, cohérent avec la contrainte cPanel mono-process).
// Par appareil (IP réelle, voir trustProxy) : seuls les ÉCHECS comptent.
// Toute l'agence partage souvent une même adresse publique (Wi-Fi du
// bureau, NAT des opérateurs mobiles) : compter les connexions réussies
// bloquait des collègues qui n'avaient rien fait de mal.
export const authLimiter = rateLimit({
  windowMs: minutes(15),
  limit: envNumber("LOGIN_RATE_LIMIT_PER_IP", 30),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Trop de tentatives de connexion depuis ce réseau. Réessayez dans 15 minutes.",
  },
});

// Par compte : un mot de passe deviné depuis plusieurs adresses reste
// limité, sans pénaliser les autres comptes du même réseau.
export const loginAccountLimiter = rateLimit({
  windowMs: minutes(15),
  limit: envNumber("LOGIN_RATE_LIMIT_PER_ACCOUNT", 8),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `account:${String(req.body?.email ?? "").trim().toLowerCase()}`,
  message: {
    message: "Trop de tentatives sur ce compte. Réessayez dans 15 minutes ou réinitialisez votre mot de passe.",
  },
});

// « Mot de passe oublié » : chaque appel envoie un e-mail.
export const passwordResetLimiter = rateLimit({
  windowMs: minutes(15),
  limit: envNumber("PASSWORD_RESET_RATE_LIMIT", 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de demandes de réinitialisation. Réessayez dans 15 minutes." },
});

// Vérification et utilisation d'un lien ou d'une clé d'accès.
export const tokenLimiter = rateLimit({
  windowMs: minutes(15),
  limit: envNumber("TOKEN_RATE_LIMIT", 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop d'essais. Réessayez dans 15 minutes." },
});

// Formulaires publics non authentifiés (demande de location, collecte de
// bien) : plus permissif que le login (une soumission légitime peut être
// reprise après une erreur de saisie) mais suffisant pour empêcher qu'une
// route ouverte serve à inonder la base de faux dossiers.
export const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Trop de soumissions depuis cet appareil. Veuillez réessayer plus tard.",
  },
});
