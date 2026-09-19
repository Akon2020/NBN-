import { AppSetting, Role } from "../models/index.model.js";
import { getMailbox, getMailboxes } from "../config/mailboxes.js";

// Audience effective d'une boîte professionnelle : celle réglée dans
// Paramètres si elle existe, sinon celle déclarée sur le serveur. Les
// identifiants de la boîte, eux, ne quittent jamais les variables
// d'environnement.

export const MAILBOX_AUDIENCES_KEY = "mailboxes.audiences";
const MAX_AUDIENCE_USERS = 50;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Cache court en mémoire : l'audience est lue à chaque consultation de
// message. Vidé à chaque modification dans ce process ; un autre process
// (cluster) la voit au plus tard après ce délai.
const CACHE_TTL_MS = 30000;
let cache = null;

export const clearMailboxAudienceCache = () => {
  cache = null;
};

const parse = (raw) => {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};

const loadOverrides = async () => {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const setting = await AppSetting.findOne({ where: { key: MAILBOX_AUDIENCES_KEY } });
  cache = { value: setting ? parse(setting.value) : {}, at: Date.now() };
  return cache.value;
};

const applyOverride = (mailbox, overrides) => {
  const override = overrides[mailbox.key];
  if (!override) return { ...mailbox, audienceSource: "env" };
  return {
    ...mailbox,
    roles: Array.isArray(override.roles) ? override.roles : [],
    users: Array.isArray(override.users) ? override.users : [],
    audienceSource: "settings",
  };
};

export const getEffectiveMailboxes = async () => {
  const overrides = await loadOverrides();
  return getMailboxes().map((mailbox) => applyOverride(mailbox, overrides));
};

export const getEffectiveMailbox = async (key) => {
  const mailbox = getMailbox(key);
  return mailbox ? applyOverride(mailbox, await loadOverrides()) : null;
};

// Retourne `{ roles, users }` normalisés, ou `{ error }`.
export const validateAudience = async (body) => {
  if (!Array.isArray(body?.roles) || !Array.isArray(body?.users)) {
    return { error: "roles et users doivent être des listes." };
  }
  const roles = [...new Set(body.roles.map((role) => String(role).trim()).filter(Boolean))];
  const users = [...new Set(body.users.map((email) => String(email).trim().toLowerCase()).filter(Boolean))];

  if (!roles.length && !users.length) {
    return { error: "Une boîte doit garder au moins un rôle ou un compte destinataire." };
  }
  if (users.length > MAX_AUDIENCE_USERS) {
    return { error: `${MAX_AUDIENCE_USERS} comptes au maximum.` };
  }
  const invalidEmails = users.filter((email) => !EMAIL_FORMAT.test(email));
  if (invalidEmails.length) {
    return { error: `Adresse e-mail invalide : ${invalidEmails.join(", ")}.` };
  }
  if (roles.length) {
    const known = await Role.findAll({ where: { name: roles }, attributes: ["name"] });
    const unknown = roles.filter((role) => !known.some((row) => row.name === role));
    if (unknown.length) return { error: `Rôle inconnu : ${unknown.join(", ")}.` };
  }
  return { roles, users };
};

const writeOverrides = async (mutate, idUser) => {
  const [setting] = await AppSetting.findOrCreate({
    where: { key: MAILBOX_AUDIENCES_KEY },
    defaults: {
      value: JSON.stringify({}),
      description: "Destinataires des messages de chaque boîte professionnelle (réglés par ses membres)",
    },
  });
  const overrides = parse(setting.value);
  mutate(overrides);
  await setting.update({ value: JSON.stringify(overrides), updatedBy: idUser ?? null });
  clearMailboxAudienceCache();
};

export const saveMailboxAudience = (key, audience, idUser) =>
  writeOverrides((overrides) => {
    overrides[key] = { roles: audience.roles, users: audience.users };
  }, idUser);

export const removeMailboxAudience = (key, idUser) =>
  writeOverrides((overrides) => {
    delete overrides[key];
  }, idUser);
