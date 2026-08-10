import rateLimit from "express-rate-limit";

// SEC-G07 : limite les tentatives de connexion/inscription pour freiner le brute-force,
// sans dépendance externe (store in-memory, cohérent avec la contrainte cPanel mono-process).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
  },
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
