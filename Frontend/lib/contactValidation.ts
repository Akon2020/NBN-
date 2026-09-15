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

// CCM = Code CoMmissionnaire (CCL identifie un client). "ccm 42" → "CCM-042".
export const normalizeCommissionnaireCode = (raw: string): string | null => {
  const match = /^CCM[\s-]?(\d{1,4})$/i.exec(raw.trim())
  return match ? `CCM-${match[1].padStart(3, "0")}` : null
}
