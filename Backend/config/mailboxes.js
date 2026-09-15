// Boîtes mail professionnelles relevées par le système (IMAP) et depuis
// lesquelles on répond (SMTP). Déclarées par variables d'environnement —
// les mots de passe n'ont rien à faire en base ni dans le code :
//
//   MAILBOXES=contact,direction
//   MAILBOX_CONTACT_ADDRESS=contact@nbnexpress.org
//   MAILBOX_CONTACT_USER / MAILBOX_CONTACT_PASSWORD
//   MAILBOX_CONTACT_IMAP_HOST / _IMAP_PORT / _IMAP_SECURE
//   MAILBOX_CONTACT_SMTP_HOST / _SMTP_PORT / _SMTP_SECURE
//   MAILBOX_CONTACT_ROLES=admin,communication,marketing   (qui voit ses messages)
//   MAILBOX_CONTACT_USERS=prenom.nom@nbnexpress.org        (comptes en plus)
//
// Une future boîte professionnelle (ex. `MAILBOXES=contact,direction,jean`)
// n'exige aucun code : son audience est la liste ROLES/USERS, plus le compte
// utilisateur dont l'e-mail est l'adresse de la boîte elle-même.
//
// Développement : `MAILBOX_<KEY>_USE_DEFAULT_ACCOUNT=true` relève le compte
// Gmail EMAIL / EMAIL_PASSWORD (imap.gmail.com / smtp.gmail.com, mot de
// passe d'application Google).

// Audiences demandées par l'agence. Écrasables par MAILBOX_<KEY>_ROLES.
const DEFAULT_ROLES = {
  contact: ["admin", "communication", "marketing"],
  direction: ["direction"],
};

const GMAIL = {
  imapHost: "imap.gmail.com",
  imapPort: 993,
  imapSecure: true,
  smtpHost: "smtp.gmail.com",
  smtpPort: 465,
  smtpSecure: true,
};

const list = (value) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const bool = (value, fallback) =>
  value === undefined || value === "" ? fallback : String(value).trim() === "true";

// Lu à chaque appel (pas figé à l'import) : les tests et un changement de
// configuration n'exigent pas de recharger les modules.
export const getMailboxes = (env = process.env) =>
  list(env.MAILBOXES).map((rawKey) => {
    const key = rawKey.toLowerCase();
    const read = (suffix) => env[`MAILBOX_${key.toUpperCase()}_${suffix}`];
    const useDefault = bool(read("USE_DEFAULT_ACCOUNT"), false);

    const user = useDefault ? env.EMAIL : read("USER") || read("ADDRESS");
    const password = useDefault ? env.EMAIL_PASSWORD : read("PASSWORD");
    const address = (read("ADDRESS") || user || "").toLowerCase();

    const mailbox = {
      key,
      label: read("LABEL") || address,
      address,
      user,
      password,
      imapHost: read("IMAP_HOST") || (useDefault ? GMAIL.imapHost : undefined),
      imapPort: Number(read("IMAP_PORT")) || (useDefault ? GMAIL.imapPort : 993),
      imapSecure: bool(read("IMAP_SECURE"), true),
      smtpHost: read("SMTP_HOST") || (useDefault ? GMAIL.smtpHost : undefined),
      smtpPort: Number(read("SMTP_PORT")) || (useDefault ? GMAIL.smtpPort : 465),
      smtpSecure: bool(read("SMTP_SECURE"), true),
      roles: read("ROLES") !== undefined ? list(read("ROLES")) : DEFAULT_ROLES[key] || [],
      users: list(read("USERS")).map((email) => email.toLowerCase()),
    };

    // Une boîte sans identifiants reste déclarée (son audience est connue)
    // mais n'est ni relevée ni utilisable pour répondre.
    mailbox.canReceive = Boolean(mailbox.imapHost && user && password);
    mailbox.canSend = Boolean(mailbox.smtpHost && user && password);
    return mailbox;
  });

export const getMailbox = (key, env = process.env) =>
  getMailboxes(env).find((mailbox) => mailbox.key === String(key).toLowerCase()) || null;
