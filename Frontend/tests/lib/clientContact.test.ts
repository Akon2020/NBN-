import { describe, it, expect } from "vitest"
import {
  clientContactMessage,
  clientContactSubject,
  mailtoLink,
  whatsAppLink,
  whatsAppNumberOf,
} from "@/lib/clientContact"

describe("Contacter un client", () => {
  it("met le numéro au format attendu par WhatsApp", () => {
    expect(whatsAppNumberOf("0977 103 143")).toBe("243977103143")
    expect(whatsAppNumberOf("+243 977-103-143")).toBe("243977103143")
    expect(whatsAppNumberOf("123")).toBeNull()
  })

  it("construit un lien WhatsApp avec le message encodé", () => {
    const link = whatsAppLink("+243977103143", "Bonjour Jeanne & famille")
    expect(link).toBe("https://wa.me/243977103143?text=Bonjour%20Jeanne%20%26%20famille")
    expect(whatsAppLink(null, "x")).toBeNull()
  })

  it("construit un lien e-mail avec objet et corps", () => {
    const link = mailtoLink("jeanne@gmail.com", clientContactSubject("CLI-2026-000042"), "Bonjour")
    expect(link).toContain("mailto:jeanne%40gmail.com")
    expect(decodeURIComponent(link!)).toContain("dossier CLI-2026-000042")
    expect(mailtoLink("", "x", "y")).toBeNull()
  })

  it("pré-remplit un message personnalisé et modifiable", () => {
    const message = clientContactMessage({ fullName: "Jeanne Mukendi", dossierNumber: "CLI-1", agentName: "Isaac" })
    expect(message).toContain("Bonjour Jeanne Mukendi,")
    expect(message).toContain("Je suis Isaac, de NBN Express.")
    expect(message).toContain("(dossier CLI-1)")
  })
})
