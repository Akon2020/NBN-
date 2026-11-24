import { describe, it, expect } from "vitest"
import { gmailComposeLink, mailtoComposeLink, replySubject } from "@/lib/gmail"

describe("gmailComposeLink", () => {
  it("ouvre un nouveau message sur le compte de l'agence, paramètres encodés", () => {
    const link = gmailComposeLink({ to: "client@example.com", subject: "Dossier CCL-001 & suite", body: "Bonjour,\nà bientôt" })
    expect(link.startsWith("https://mail.google.com/mail/?authuser=contact%40nbnexpress.org&view=cm&fs=1&to=client%40example.com")).toBe(true)
    expect(link).toContain("su=Dossier%20CCL-001%20%26%20suite")
    expect(link).toContain("body=Bonjour%2C%0A%C3%A0%20bient%C3%B4t")
  })

  it("réunit plusieurs destinataires en copie cachée", () => {
    const link = gmailComposeLink({ to: "contact@nbnexpress.org", bcc: ["a@x.org", "b@y.org"], subject: "s", body: "b" })
    expect(link).toContain("bcc=a%40x.org%2Cb%40y.org")
  })
})

describe("mailtoComposeLink", () => {
  it("sert de secours sur téléphone", () => {
    expect(mailtoComposeLink({ to: "c@x.org", subject: "Objet", body: "Texte" })).toBe("mailto:c%40x.org?subject=Objet&body=Texte")
  })
})

describe("replySubject", () => {
  it("préfixe Re: une seule fois", () => {
    expect(replySubject("Visite")).toBe("Re: Visite")
    expect(replySubject("RE: Visite")).toBe("RE: Visite")
  })
})
