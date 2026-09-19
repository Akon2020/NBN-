import { BAILLEUR_PRIORITES, type Bailleur } from "@/lib/types"

// Même ordre que le Backend (VIP, PREMIUM, STANDARD, INACTIF, puis
// alphabétique) — réappliqué après un ajout ou une modification locale, sans
// recharger la liste.
export const sortBailleurs = (bailleurs: Bailleur[]): Bailleur[] =>
  [...bailleurs].sort((a, b) => {
    const byPriority = BAILLEUR_PRIORITES.indexOf(a.priorite) - BAILLEUR_PRIORITES.indexOf(b.priorite)
    if (byPriority !== 0) return byPriority
    return (a.person?.fullName || "").localeCompare(b.person?.fullName || "", "fr", { sensitivity: "base" })
  })

export const initialsOf = (fullName?: string | null) =>
  (fullName || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
