import { whatsAppNumberOf } from "@/lib/clientContact"
import { normalizePhone } from "@/lib/contactValidation"

// Liens d'action pour contacter un bailleur depuis son téléphone.

export const telLink = (phone?: string | null) => {
  const number = phone ? normalizePhone(phone) : null
  return number ? `tel:${number}` : null
}

// `sms:<num>?&body=` est compris à la fois par iOS et par Android.
export const smsLink = (phone: string | null | undefined, body: string) => {
  const number = phone ? normalizePhone(phone) : null
  return number ? `sms:${number}?&body=${encodeURIComponent(body)}` : null
}

export const bailleurWhatsAppLink = (phone: string | null | undefined, body: string) => {
  const number = whatsAppNumberOf(phone)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(body)}` : null
}

export const personalize = (text: string, fullName?: string | null) => text.replaceAll("{nom}", fullName || "")

export const DEFAULT_BAILLEUR_MESSAGE =
  "Bonjour {nom},\n\nJe me permets de vous contacter au sujet de vos biens confiés à NBN Express.\n\nCordialement,\nL'équipe NBN Express"
