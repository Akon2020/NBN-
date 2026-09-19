import { describe, it, expect } from "vitest"
import { bailleurWhatsAppLink, personalize, smsLink, telLink } from "@/lib/bailleurContact"

describe("Liens de contact d'un bailleur", () => {
  it("appel, SMS et WhatsApp à partir d'un numéro local", () => {
    expect(telLink("0977 103 143")).toBe("tel:+243977103143")
    expect(smsLink("0977 103 143", "Bonjour")).toBe("sms:+243977103143?&body=Bonjour")
    expect(bailleurWhatsAppLink("0977 103 143", "Bonjour")).toBe("https://wa.me/243977103143?text=Bonjour")
  })

  it("aucun lien sans numéro exploitable", () => {
    expect(telLink("")).toBeNull()
    expect(smsLink("12", "x")).toBeNull()
  })

  it("remplace {nom} par le nom du bailleur", () => {
    expect(personalize("Bonjour {nom}, merci {nom}", "Mama Furaha")).toBe("Bonjour Mama Furaha, merci Mama Furaha")
  })
})
