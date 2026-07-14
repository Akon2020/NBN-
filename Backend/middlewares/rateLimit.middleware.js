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
