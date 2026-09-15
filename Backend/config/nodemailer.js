import nodemailer from "nodemailer";
import {
  EMAIL,
  EMAIL_PASSWORD,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASSWORD,
  MAIL_FROM,
  SMTP_CONNECTION_TIMEOUT_MS,
  SMTP_GREETING_TIMEOUT_MS,
  SMTP_SOCKET_TIMEOUT_MS,
  MAIL_TIMEOUT_MS,
} from "./env.js";

const toMs = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Bornes propres au dialogue SMTP (connexion TCP, bannière, socket).
const TIMEOUTS = {
  connectionTimeout: toMs(SMTP_CONNECTION_TIMEOUT_MS, 8000),
  greetingTimeout: toMs(SMTP_GREETING_TIMEOUT_MS, 8000),
  socketTimeout: toMs(SMTP_SOCKET_TIMEOUT_MS, 10000),
};

/**
 * Transport SMTP générique. `host` vide → compte Gmail (développement),
 * sinon serveur explicite (production : le SMTP de nbnexpress.org).
 */
export const createSmtpTransport = ({ host, port, secure, user, pass }) =>
  nodemailer.createTransport(
    host
      ? {
          host,
          port: Number(port) || 465,
          // `secure` = TLS implicite (465). Sur 587 le serveur passe en TLS
          // via STARTTLS : il faut alors `false`.
          secure: secure === undefined ? Number(port || 465) === 465 : secure,
          auth: { user, pass },
          ...TIMEOUTS,
        }
      : { service: "Gmail", auth: { user, pass }, ...TIMEOUTS }
  );

// Transport des e-mails applicatifs (bienvenue, mot de passe, accusés de
// réception, notifications). SMTP_* en production ; en développement,
// SMTP_HOST vide retombe sur le compte Gmail EMAIL / EMAIL_PASSWORD.
const SENDER_ACCOUNT = SMTP_HOST ? SMTP_USER : EMAIL;
const transporter = createSmtpTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE === undefined || SMTP_SECURE === "" ? undefined : SMTP_SECURE === "true",
  user: SENDER_ACCOUNT,
  pass: SMTP_HOST ? SMTP_PASSWORD : EMAIL_PASSWORD,
});

// Expéditeur affiché. Un serveur SMTP refuse souvent un « From » qui n'est
// pas le compte authentifié : par défaut on n'invente donc rien.
export const DEFAULT_FROM = MAIL_FROM || (SENDER_ACCOUNT ? `"NBN Express" <${SENDER_ACCOUNT}>` : undefined);

const HARD_TIMEOUT_MS = toMs(MAIL_TIMEOUT_MS, 8000);

/**
 * Envoi borné dans le temps, quelle que soit l'étape qui bloque.
 *
 * Les délais de nodemailer ci-dessus ne couvrent que le dialogue SMTP : ils
 * ne s'appliquent pas à la résolution DNS du serveur mail, qui a son propre
 * délai (mesuré à ~69 s sur un réseau où le DNS sortant est filtré). Ce
 * garde-fou libère l'appelant après `MAIL_TIMEOUT_MS`. L'envoi sous-jacent
 * n'est pas annulable : il continue en arrière-plan et son éventuel échec
 * est absorbé.
 */
export const sendWithTimeout = async (transport, mailOptions) => {
  const pending = transport.sendMail(mailOptions);
  // L'échec peut survenir après l'abandon : sans ce catch, il remonterait en
  // `unhandledRejection` et ferait tomber le process.
  pending.catch(() => {});

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `Envoi d'e-mail abandonné après ${HARD_TIMEOUT_MS} ms (serveur SMTP injoignable)`,
          ),
        ),
      HARD_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([pending, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

export const sendMail = (mailOptions) =>
  sendWithTimeout(transporter, { from: DEFAULT_FROM, ...mailOptions });

export default transporter;
