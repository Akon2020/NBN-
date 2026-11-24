// Contrôles de saisie des coordonnées, alignés sur
// Backend/utils/contactValidation.js. Le navigateur prévient tôt ; le
// Backend reste l'autorité (il vérifie aussi que le domaine e-mail existe).

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const isEmailFormatValid = (value: string) => EMAIL_FORMAT.test(value.trim().toLowerCase())

// "0977 103 143" → "+243977103143" ; `null` si inexploitable.
export const normalizePhone = (raw: string): string | null => {
  let digits = raw.trim().replace(/[\s().-]/g, "")
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`
  if (/^0\d{9}$/.test(digits)) digits = `+243${digits.slice(1)}`
  if (/^243\d{9}$/.test(digits)) digits = `+${digits}`
  if (digits.startsWith("+243")) return /^\+243\d{9}$/.test(digits) ? digits : null
  return /^\+\d{8,15}$/.test(digits) ? digits : null
}

// Conventions de codes (Backend/shared/codes.js) : commissionnaire CMR,
// collecteur CTR, client CCL. "cmr 42" → "CMR-042" ; l'ancien préfixe CCM
// d'un commissionnaire est ramené à CMR.
export const CODE_PREFIXES = { COMMISSIONNAIRE: "CMR", COLLECTEUR: "CTR", CLIENT: "CCL" } as const

const normalizeCode = (raw: string, prefix: string, legacy: string[] = []): string | null => {
  const accepted = [prefix, ...legacy].join("|")
  const match = new RegExp(`^(?:${accepted})[\\s-]?(\\d{1,6})$`, "i").exec(raw.trim())
  return match ? `${prefix}-${String(Number(match[1])).padStart(3, "0")}` : null
}

export const normalizeCommissionnaireCode = (raw: string): string | null =>
  normalizeCode(raw, CODE_PREFIXES.COMMISSIONNAIRE, ["CCM"])

export const normalizeCollecteurCode = (raw: string): string | null => normalizeCode(raw, CODE_PREFIXES.COLLECTEUR)
