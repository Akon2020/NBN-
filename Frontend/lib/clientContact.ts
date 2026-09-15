import { normalizePhone } from "@/lib/contactValidation"

// Bouton « Contacter » d'une fiche client : liens WhatsApp et e-mail
// pré-remplis. Le message s'ouvre dans l'application de l'agent (WhatsApp,
// messagerie) où il reste modifiable avant l'envoi.

// wa.me attend le numéro international sans « + » ni espaces.
export const whatsAppNumberOf = (phone?: string | null): string | null => {
  const normalized = phone ? normalizePhone(phone) : null
  return normalized ? normalized.replace(/^\+/, "") : null
}

export const whatsAppLink = (phone: string | null | undefined, message: string): string | null => {
  const number = whatsAppNumberOf(phone)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null
}

export const mailtoLink = (email: string | null | undefined, subject: string, body: string): string | null =>
  email
    ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null

export const clientContactSubject = (dossierNumber?: string | null) =>
  dossierNumber ? `Votre demande de location — dossier ${dossierNumber}` : "Votre demande de location"

export const clientContactMessage = ({
  fullName,
  dossierNumber,
  agentName,
}: {
  fullName?: string | null
  dossierNumber?: string | null
  agentName?: string | null
}) =>
  [
    `Bonjour ${fullName || ""},`.replace(" ,", ","),
    "",
    `${agentName ? `Je suis ${agentName}, de NBN Express. ` : "NBN Express vous contacte. "}Nous avons bien reçu votre demande de location${
      dossierNumber ? ` (dossier ${dossierNumber})` : ""
    } et nous recherchons actuellement les biens qui correspondent à vos critères.`,
    "",
    "Pouvez-vous nous indiquer vos disponibilités pour en discuter ou organiser une visite ?",
    "",
    "NBN Express – La crédibilité au service de votre projet immobilier.",
  ].join("\n")
