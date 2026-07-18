import { PROPERTY_TYPE_LABELS, RENTAL_UNIT_PRICE_SUFFIX, type Property } from "@/lib/types"
import { getAppSettings, type CompanyInfo } from "@/actions/appSettings"

const DEFAULT_COMPANY: CompanyInfo = {
  name: "Nyumbani Express",
  phone: "",
  address: "Bukavu, Sud-Kivu",
  email: "",
}

// GOAL 13 — coordonnées de l'agence configurables depuis Paramètres
// (company.info), plutôt qu'un nom/ville codés en dur ici.
const getCompanyInfo = async (): Promise<CompanyInfo> => {
  try {
    const settings = await getAppSettings()
    const setting = settings.find((s) => s.key === "company.info")
    return (setting?.value as CompanyInfo) || DEFAULT_COMPANY
  } catch {
    return DEFAULT_COMPANY
  }
}

// GOAL 5 — un seul générateur de message, réutilisé partout où un
// partage WhatsApp est proposé (jamais reconstruit à la main par écran).
export const buildWhatsAppProposalMessage = (
  properties: Property[],
  company: CompanyInfo = DEFAULT_COMPANY
): string => {
  const lines: string[] = []
  lines.push(`🏡 *Sélection ${company.name}*`)
  lines.push("")
  lines.push(
    properties.length > 1
      ? `Voici une sélection de ${properties.length} biens qui pourraient vous intéresser :`
      : "Voici un bien qui pourrait vous intéresser :"
  )
  lines.push("")

  const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]

  properties.forEach((property, index) => {
    const label = property.category === "RENT" ? "À louer" : "À vendre"
    lines.push(`${numberEmojis[index] || `${index + 1}.`} *${PROPERTY_TYPE_LABELS[property.propertyType]} ${label}*`)
    const location = [property.avenue, property.quartier].filter(Boolean).join(", ")
    if (location) lines.push(`📍 ${location}`)
    if (property.category === "RENT" && (property.bedrooms || property.toilets)) {
      const parts: string[] = []
      if (property.bedrooms) parts.push(`🛏️ ${property.bedrooms} ch.`)
      if (property.toilets) parts.push(`🚿 ${property.toilets} douches`)
      lines.push(parts.join(" · "))
    }
    const priceSuffix =
      property.category === "RENT" && property.rentalDetails
        ? RENTAL_UNIT_PRICE_SUFFIX[property.rentalDetails.unit]
        : ""
    lines.push(`💰 $${Number(property.price).toLocaleString("fr-FR")}${priceSuffix}`)
    lines.push("")
  })

  lines.push(
    company.phone
      ? `📞 Contactez-nous au ${company.phone} pour organiser une visite`
      : "📞 Contactez-nous pour organiser une visite"
  )
  lines.push(`*${company.name}* — ${company.address}`)

  return lines.join("\n")
}

// L'onglet est ouvert de façon synchrone (dans le même tick que le clic
// utilisateur) puis redirigé une fois les coordonnées de l'agence
// récupérées — un `window.open` après un `await` perdrait le contexte de
// geste utilisateur et serait bloqué par le navigateur comme pop-up.
export const openWhatsAppShare = async (properties: Property[], phoneNumber?: string) => {
  const tab = window.open("about:blank", "_blank")
  const company = await getCompanyInfo()
  const message = buildWhatsAppProposalMessage(properties, company)
  const encoded = encodeURIComponent(message)
  const target = phoneNumber ? `https://wa.me/${phoneNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`
  if (tab) {
    tab.location.href = target
  } else {
    window.open(target, "_blank")
  }
}
