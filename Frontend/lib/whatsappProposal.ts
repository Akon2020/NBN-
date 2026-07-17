import { PROPERTY_TYPE_LABELS, type Property } from "@/lib/types"

// GOAL 5 — un seul générateur de message, réutilisé partout où un
// partage WhatsApp est proposé (jamais reconstruit à la main par écran).
export const buildWhatsAppProposalMessage = (properties: Property[]): string => {
  const lines: string[] = []
  lines.push("🏡 *Sélection Nyumbani Express*")
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
    const priceSuffix = property.category === "RENT" ? "/mois" : ""
    lines.push(`💰 $${Number(property.price).toLocaleString("fr-FR")}${priceSuffix}`)
    lines.push("")
  })

  lines.push("📞 Contactez-nous pour organiser une visite")
  lines.push("*NBN Express* — Bukavu, Sud-Kivu")

  return lines.join("\n")
}

export const openWhatsAppShare = (properties: Property[], phoneNumber?: string) => {
  const message = buildWhatsAppProposalMessage(properties)
  const encoded = encodeURIComponent(message)
  const target = phoneNumber ? `https://wa.me/${phoneNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`
  window.open(target, "_blank")
}
