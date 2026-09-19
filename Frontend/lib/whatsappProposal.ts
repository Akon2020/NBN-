import {
  LAND_PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  RENTAL_UNIT_PRICE_SUFFIX,
  type Property,
  type RentalUnit,
} from "@/lib/types"
import { getAppSettings, type CompanyInfo } from "@/actions/appSettings"
import { getImageUrl } from "@/lib/imageUrl"

export const DEFAULT_COMPANY: CompanyInfo = {
  name: "Nyumbani Express",
  phone: "",
  address: "Bukavu, Sud-Kivu",
  email: "",
}

// GOAL 13 — coordonnées de l'agence configurables depuis Paramètres
// (company.info), plutôt qu'un nom/ville codés en dur ici.
export const getCompanyInfo = async (): Promise<CompanyInfo> => {
  try {
    const settings = await getAppSettings()
    const setting = settings.find((s) => s.key === "company.info")
    return (setting?.value as CompanyInfo) || DEFAULT_COMPANY
  } catch {
    return DEFAULT_COMPANY
  }
}

const count = (n: number, singular: string, plural = `${singular}s`) => `${n} ${n > 1 ? plural : singular}`

// Espace ordinaire comme séparateur de milliers : l'espace fine insécable
// de toLocaleString("fr-FR") s'affiche mal dans certaines versions de WhatsApp.
const formatAmount = (value: number) => String(Math.round(Number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, " ")

export const formatPropertyPrice = (property: Property) => {
  const suffix =
    property.category === "RENT" && property.rentalDetails ? RENTAL_UNIT_PRICE_SUFFIX[property.rentalDetails.unit] : ""
  return `${formatAmount(property.price)} $${suffix}`
}

const GUARANTEE_UNITS: Record<RentalUnit, [string, string]> = {
  DAY: ["jour", "jours"],
  MONTH: ["mois", "mois"],
  YEAR: ["an", "ans"],
}

const capitalize = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

export interface PropertyCaptionOptions {
  position?: number
  total?: number
  // Salutation en tête du premier message envoyé à un client.
  greetingName?: string | null
  // Sans photo jointe (ordinateur), le lien de la photo remplace la pièce jointe.
  includePhotoLink?: boolean
}

// Modèle d'un message WhatsApp pour UN bien — seul endroit où sa forme est
// définie (panier, fiches, galerie). Remplaçable par le modèle de l'agence
// sans toucher aux écrans. Émojis limités à ceux que tous les téléphones
// affichent (les chiffres encadrés 1️⃣ s'affichaient en carrés).
export const buildPropertyCaption = (
  property: Property,
  company: CompanyInfo = DEFAULT_COMPANY,
  options: PropertyCaptionOptions = {}
): string => {
  const lines: string[] = []
  if (options.greetingName) {
    lines.push(`Bonjour ${options.greetingName},`)
    lines.push("")
  }

  const label = property.category === "RENT" ? "à louer" : "à vendre"
  const numbering = options.total && options.total > 1 ? ` · Bien ${options.position}/${options.total}` : ""
  lines.push(`🏠 *${PROPERTY_TYPE_LABELS[property.propertyType]} ${label}*${numbering}`)

  const location = [
    property.avenue ? `Av. ${property.avenue.replace(/^av(enue)?\.?\s+/i, "")}` : null,
    property.quartier ? `Q. ${property.quartier}` : null,
    property.commune ? capitalize(property.commune) : null,
  ].filter(Boolean)
  if (location.length) lines.push(`📍 ${location.join(", ")}`)

  if (!LAND_PROPERTY_TYPES.includes(property.propertyType)) {
    const rooms = [
      property.bedrooms ? count(property.bedrooms, "chambre") : null,
      property.livingRooms ? count(property.livingRooms, "salon") : null,
      property.toilets ? count(property.toilets, "douche") : null,
      property.kitchens ? count(property.kitchens, "cuisine") : null,
    ].filter(Boolean)
    if (rooms.length) lines.push(`🛏️ ${rooms.join(" · ")}`)
  }

  let price = `💰 *${formatPropertyPrice(property)}*`
  const guarantee = property.rentalDetails?.guarantee
  if (property.category === "RENT" && property.rentalDetails && guarantee) {
    const [one, many] = GUARANTEE_UNITS[property.rentalDetails.unit]
    price += ` · garantie ${guarantee} ${guarantee > 1 ? many : one}`
  }
  lines.push(price)

  const description = property.description?.trim()
  if (description) {
    lines.push("")
    lines.push(description.length > 200 ? `${description.slice(0, 197).trimEnd()}…` : description)
  }

  const photo = property.images?.[0]?.image
  if (options.includePhotoLink && photo) {
    lines.push("")
    lines.push(`📷 Photo : ${getImageUrl(photo)}`)
  }

  lines.push("")
  lines.push(`Réf. NBN-${property.idProperty}`)
  lines.push(
    company.phone
      ? `*${company.name}* · ${company.phone}`
      : `*${company.name}* · ${company.address}`
  )
  return lines.join("\n")
}

// Tous les biens dans un seul texte (repli sans partage de fichiers).
export const buildWhatsAppProposalMessage = (properties: Property[], company: CompanyInfo = DEFAULT_COMPANY) =>
  properties
    .map((property, index) =>
      buildPropertyCaption(property, company, {
        position: index + 1,
        total: properties.length,
        includePhotoLink: true,
      })
    )
    .join("\n\n———\n\n")

export const whatsAppShareUrl = (text: string, phoneNumber?: string | null) => {
  const encoded = encodeURIComponent(text)
  return phoneNumber ? `https://wa.me/${phoneNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}

// Première photo du bien en fichier, pour la joindre au message (le lien
// wa.me ne transporte que du texte).
export const loadPropertyPhoto = async (property: Property): Promise<File | null> => {
  const path = property.images?.[0]?.image
  if (!path) return null
  try {
    const response = await fetch(getImageUrl(path))
    if (!response.ok) return null
    const blob = await response.blob()
    const type = blob.type || "image/jpeg"
    const extension = (type.split("/")[1] || "jpg").replace("jpeg", "jpg")
    return new File([blob], `bien-NBN-${property.idProperty}.${extension}`, { type })
  } catch {
    return null
  }
}

// Partage natif (téléphone) : seul moyen, sans API WhatsApp Business, de
// faire partir la photo avec le message depuis le navigateur.
export const canShareFiles = (files: File[]) =>
  typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files })

export const shareWithPhoto = async (file: File, text: string): Promise<"shared" | "cancelled" | "failed"> => {
  try {
    await navigator.share({ files: [file], text })
    return "shared"
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "failed"
  }
}
