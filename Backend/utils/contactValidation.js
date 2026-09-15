import { promises as dns } from "dns";
import { EMAIL_MX_CHECK_TIMEOUT_MS } from "../config/env.js";

// Vérifications des coordonnées saisies dans les formulaires publics.
// Objectif métier : le bouton « Contacter » de la fiche client et
// l'accusé de réception doivent pouvoir joindre la personne — une adresse
// ou un numéro faux se découvre sinon au moment de rappeler le client.

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Codes DNS qui prouvent que le domaine ne peut pas recevoir de mail
// (domaine inexistant, ou existant sans serveur de messagerie).
const UNDELIVERABLE_DNS_CODES = ["ENOTFOUND", "ENODATA", "NXDOMAIN"];

/**
 * Crée un vérificateur d'adresse. `resolveMx` est injectable pour les tests.
 * Retourne `{ ok, email, reason }` — `email` normalisé (trim + minuscules).
 *
 * Un DNS lent ou en panne n'invalide jamais une adresse (on accepte) :
 * refuser un vrai client parce que le résolveur du serveur a hoqueté
 * serait pire que laisser passer une faute de frappe rare.
 */
export const createEmailChecker = ({
  resolveMx = (domain) => dns.resolveMx(domain),
  timeoutMs = Number(EMAIL_MX_CHECK_TIMEOUT_MS || 3000),
} = {}) => {
  return async (raw) => {
    const email = String(raw ?? "").trim().toLowerCase();
    if (!EMAIL_FORMAT.test(email)) {
      return { ok: false, email, reason: "L'adresse e-mail n'est pas valide." };
    }

    const domain = email.split("@")[1];
    let timer;
    try {
      const records = await Promise.race([
        resolveMx(domain),
        new Promise((resolve) => {
          timer = setTimeout(() => resolve(null), timeoutMs);
        }),
      ]);
      if (Array.isArray(records) && records.length === 0) {
        return { ok: false, email, reason: `Le domaine « ${domain} » ne reçoit pas d'e-mails.` };
      }
      return { ok: true, email };
    } catch (error) {
      if (UNDELIVERABLE_DNS_CODES.includes(error?.code)) {
        return { ok: false, email, reason: `Le domaine « ${domain} » n'existe pas ou ne reçoit pas d'e-mails.` };
      }
      return { ok: true, email };
    } finally {
      clearTimeout(timer);
    }
  };
};

export const checkEmail = createEmailChecker();

/**
 * Normalise un numéro de téléphone au format international.
 * - "0977 103 143", "+243 977-103-143", "00243977103143" → "+243977103143"
 * - un numéro étranger en format international est conservé (+250..., +257...)
 * Retourne `null` si le numéro est inexploitable.
 */
export const normalizePhone = (raw) => {
  let digits = String(raw ?? "").trim().replace(/[\s().-]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (/^0\d{9}$/.test(digits)) digits = `+243${digits.slice(1)}`;
  if (/^243\d{9}$/.test(digits)) digits = `+${digits}`;

  if (digits.startsWith("+243")) {
    return /^\+243\d{9}$/.test(digits) ? digits : null;
  }
  return /^\+\d{8,15}$/.test(digits) ? digits : null;
};

/**
 * Code commissionnaire (CCM = Code CoMmissionnaire ; CCL identifie un client).
 * "ccm 42", "CCM042", "CCM-042" → "CCM-042". `null` si le format est faux.
 */
export const normalizeCommissionnaireCode = (raw) => {
  const match = /^CCM[\s-]?(\d{1,4})$/i.exec(String(raw ?? "").trim());
  return match ? `CCM-${match[1].padStart(3, "0")}` : null;
};
