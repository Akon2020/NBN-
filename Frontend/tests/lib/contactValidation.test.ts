import { describe, it, expect } from "vitest"
import {
  isEmailFormatValid,
  normalizeCommissionnaireCode,
  normalizeCollecteurCode,
  normalizePhone,
} from "@/lib/contactValidation"

describe("contactValidation (Frontend)", () => {
  it("vérifie le format d'une adresse e-mail", () => {
    expect(isEmailFormatValid(" Jeanne@Gmail.com ")).toBe(true)
    expect(isEmailFormatValid("jeanne@gmail")).toBe(false)
  })

  it("normalise les numéros congolais et refuse les numéros incomplets", () => {
    expect(normalizePhone("0977 103 143")).toBe("+243977103143")
    expect(normalizePhone("+250 788 123 456")).toBe("+250788123456")
    expect(normalizePhone("+24397710")).toBeNull()
  })

  it("normalise le code CMR (ancien CCM accepté), CTR, et refuse un code CCL", () => {
    expect(normalizeCommissionnaireCode("cmr 42")).toBe("CMR-042")
    expect(normalizeCommissionnaireCode("ccm 42")).toBe("CMR-042")
    expect(normalizeCommissionnaireCode("CCL-042")).toBeNull()
    expect(normalizeCollecteurCode("ctr7")).toBe("CTR-007")
    expect(normalizeCollecteurCode("CMR-007")).toBeNull()
  })
})
