import { describe, it, expect } from "vitest"
import { initialsOf, sortBailleurs } from "@/lib/bailleurs"
import type { Bailleur } from "@/lib/types"

const bailleur = (idBailleur: number, fullName: string, priorite: Bailleur["priorite"]) =>
  ({ idBailleur, priorite, person: { fullName } }) as Bailleur

describe("sortBailleurs", () => {
  it("classe VIP, Premium, Standard, Inactif, puis par ordre alphabétique", () => {
    const sorted = sortBailleurs([
      bailleur(1, "Zoé", "STANDARD"),
      bailleur(2, "Élise", "VIP"),
      bailleur(3, "Bruno", "INACTIF"),
      bailleur(4, "Aline", "VIP"),
      bailleur(5, "Chantal", "PREMIUM"),
    ])
    // « Élise » se range avec les E, pas après Z : comparaison en français.
    expect(sorted.map((b) => b.person?.fullName)).toEqual(["Aline", "Élise", "Chantal", "Zoé", "Bruno"])
  })
})

describe("initialsOf", () => {
  it("prend les initiales des deux premiers mots", () => {
    expect(initialsOf("jeanne mukendi kabila")).toBe("JM")
    expect(initialsOf("")).toBe("?")
  })
})
