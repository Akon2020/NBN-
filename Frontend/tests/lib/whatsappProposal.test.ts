import { describe, it, expect, vi } from "vitest"

vi.mock("@/actions/appSettings", () => ({ getAppSettings: vi.fn().mockResolvedValue([]) }))

import { buildPropertyCaption, buildWhatsAppProposalMessage, whatsAppShareUrl } from "@/lib/whatsappProposal"
import type { Property } from "@/lib/types"

const company = { name: "Nyumbani Express", phone: "+243 970 000 000", address: "Bukavu", email: "" }

const rental = {
  idProperty: 12,
  category: "RENT",
  propertyType: "MAISON",
  avenue: "Avenue Lumumba",
  quartier: "Nyawera",
  commune: "IBANDA",
  bedrooms: 3,
  livingRooms: 1,
  toilets: 2,
  kitchens: 0,
  price: 1200,
  rentalDetails: { idProperty: 12, guarantee: 3, unit: "MONTH" },
  images: [{ idPropertyImage: 1, idProperty: 12, image: "uploads/images/maison.jpg", order: 1 }],
} as unknown as Property

const land = {
  idProperty: 30,
  category: "SALE",
  propertyType: "TERRAIN_PLAT",
  quartier: "Muhumba",
  bedrooms: 2,
  price: 45000,
} as unknown as Property

describe("Modèle de message WhatsApp par bien", () => {
  it("présente le bien sur des lignes courtes et lisibles", () => {
    const caption = buildPropertyCaption(rental, company, { position: 1, total: 2, greetingName: "Amani Bisimwa" })
    const lines = caption.split("\n")
    expect(lines[0]).toBe("Bonjour Amani Bisimwa,")
    expect(caption).toContain("🏠 *Maison à louer* · Bien 1/2")
    expect(caption).toContain("📍 Av. Lumumba, Q. Nyawera, Ibanda")
    expect(caption).toContain("🛏️ 3 chambres · 1 salon · 2 douches")
    expect(caption).not.toContain("cuisine")
    expect(caption).toContain("💰 *1 200 $/mois* · garantie 3 mois")
    expect(caption).toContain("Réf. NBN-12")
    expect(caption).toContain("*Nyumbani Express* · +243 970 000 000")
    // Les chiffres encadrés s'affichaient en carrés sur certains téléphones.
    expect(caption).not.toMatch(/⃣/)
  })

  it("n'ajoute le lien de la photo que sans pièce jointe", () => {
    expect(buildPropertyCaption(rental, company)).not.toContain("📷")
    expect(buildPropertyCaption(rental, company, { includePhotoLink: true })).toContain(
      "📷 Photo : /uploads/images/maison.jpg"
    )
  })

  it("n'indique ni pièces ni numérotation pour un terrain seul", () => {
    const caption = buildPropertyCaption(land, company, { position: 1, total: 1 })
    expect(caption).toContain("🏠 *Terrain plat à vendre*")
    expect(caption).not.toContain("Bien 1/1")
    expect(caption).not.toContain("🛏️")
    expect(caption).toContain("💰 *45 000 $*")
  })

  it("regroupe plusieurs biens en un texte de repli", () => {
    const message = buildWhatsAppProposalMessage([rental, land], company)
    expect(message).toContain("Bien 1/2")
    expect(message).toContain("Bien 2/2")
  })

  it("adresse le lien au numéro du client quand il est connu", () => {
    expect(whatsAppShareUrl("Salut", "243991234567")).toBe("https://wa.me/243991234567?text=Salut")
    expect(whatsAppShareUrl("Salut")).toBe("https://wa.me/?text=Salut")
  })
})
