import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const {
  PORT,
  NODE_ENV,
  URL_ORIGIN,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_WEB_DAYS,
  REFRESH_TOKEN_EXPIRES_MOBILE_DAYS,
  EMAIL,
  EMAIL_PASSWORD,
  HOST_URL,
  FRONT_URL,
  DEFAULT_PASSWD,
  MAX_IMAGE_SIZE_MB,
  MAX_VIDEO_SIZE_MB,
  // Origines CORS autorisées en production, séparées par des virgules.
  // Vide = la liste par défaut de `app.js` (domaines nbnexpress.org).
  CORS_ORIGINS,
  // Nombre de reverse proxies devant l'API (voir config/trustProxy.js).
  TRUST_PROXY,
  // Délais SMTP (ms). Un serveur mail injoignable ne doit jamais retenir
  // une requête HTTP : sans ces bornes, nodemailer attend son propre
  // défaut (plusieurs minutes) et fait expirer la requête appelante.
  SMTP_CONNECTION_TIMEOUT_MS,
  SMTP_GREETING_TIMEOUT_MS,
  SMTP_SOCKET_TIMEOUT_MS,
  // Garde-fou global sur un envoi d'e-mail, résolution DNS comprise (les
  // délais SMTP ci-dessus ne la couvrent pas).
  MAIL_TIMEOUT_MS,
  // Délai maximal de la vérification DNS (MX) d'une adresse e-mail saisie
  // dans un formulaire public. Au-delà, l'adresse est acceptée.
  EMAIL_MX_CHECK_TIMEOUT_MS,
} = process.env;
