import nodemailer from "nodemailer";
import {
  EMAIL,
  EMAIL_PASSWORD,
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
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: EMAIL,
    pass: EMAIL_PASSWORD,
  },
  connectionTimeout: toMs(SMTP_CONNECTION_TIMEOUT_MS, 8000),
  greetingTimeout: toMs(SMTP_GREETING_TIMEOUT_MS, 8000),
  socketTimeout: toMs(SMTP_SOCKET_TIMEOUT_MS, 10000),
});

const HARD_TIMEOUT_MS = toMs(MAIL_TIMEOUT_MS, 8000);

/**
 * Envoi d'e-mail borné dans le temps, quelle que soit l'étape qui bloque.
 *
 * Les délais de nodemailer ci-dessus ne couvrent que le dialogue SMTP : ils
 * ne s'appliquent pas à la résolution DNS du serveur mail, qui a son propre
 * délai (mesuré à ~69 s sur un réseau où le DNS sortant est filtré). Un
 * `sendMail` nu peut donc retenir la requête HTTP appelante bien au-delà de
 * toute limite raisonnable — c'est ce qui faisait expirer les tests
 * d'intégration créant un utilisateur.
 *
 * Ce garde-fou libère l'appelant après `MAIL_TIMEOUT_MS`. L'envoi sous-jacent
 * n'est pas annulable : il continue en arrière-plan et son éventuel échec est
 * absorbé, ce qui est acceptable ici — aucun appel métier ne dépend du
 * résultat de l'envoi, seulement de sa tentative.
 */
export const sendMail = async (mailOptions) => {
  const pending = transporter.sendMail(mailOptions);
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

export default transporter;
