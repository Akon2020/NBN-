import { describe, it, expect } from "vitest";
import {
  createEmailChecker,
  normalizeCommissionnaireCode,
  normalizePhone,
} from "../utils/contactValidation.js";

const dnsError = (code) => Object.assign(new Error(code), { code });

describe("createEmailChecker", () => {
  it("accepte une adresse dont le domaine reçoit des e-mails, normalisée", async () => {
    const check = createEmailChecker({ resolveMx: async () => [{ exchange: "mx.gmail.com" }] });
    await expect(check("  Jeanne.Mukendi@Gmail.com ")).resolves.toEqual({
      ok: true,
      email: "jeanne.mukendi@gmail.com",
    });
  });

  it("refuse un format invalide sans interroger le DNS", async () => {
    let called = false;
    const check = createEmailChecker({ resolveMx: async () => { called = true; return []; } });
    const result = await check("jeanne@gmail");
    expect(result.ok).toBe(false);
    expect(called).toBe(false);
  });

  it("refuse un domaine inexistant (faute de frappe type gmial.con)", async () => {
    const check = createEmailChecker({ resolveMx: async () => { throw dnsError("ENOTFOUND"); } });
    const result = await check("jeanne@gmial.con");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/gmial\.con/);
  });

  it("n'invalide jamais une adresse quand le DNS est lent ou en panne", async () => {
    const slow = createEmailChecker({ resolveMx: () => new Promise(() => {}), timeoutMs: 20 });
    const broken = createEmailChecker({ resolveMx: async () => { throw dnsError("ETIMEOUT"); } });
    await expect(slow("jeanne@gmail.com")).resolves.toMatchObject({ ok: true });
    await expect(broken("jeanne@gmail.com")).resolves.toMatchObject({ ok: true });
  });
});

describe("normalizePhone", () => {
  it("met un numéro congolais au format international", () => {
    expect(normalizePhone("0977 103 143")).toBe("+243977103143");
    expect(normalizePhone("+243 977-103-143")).toBe("+243977103143");
    expect(normalizePhone("00243977103143")).toBe("+243977103143");
    expect(normalizePhone("243977103143")).toBe("+243977103143");
  });

  it("conserve un numéro étranger international", () => {
    expect(normalizePhone("+250 788 123 456")).toBe("+250788123456");
  });

  it("refuse un numéro incomplet ou fantaisiste", () => {
    expect(normalizePhone("+24397710")).toBeNull();
    expect(normalizePhone("977103")).toBeNull();
    expect(normalizePhone("appelez-moi")).toBeNull();
  });
});

describe("normalizeCommissionnaireCode", () => {
  it("accepte les variantes de saisie du code CCM", () => {
    expect(normalizeCommissionnaireCode("CCM-042")).toBe("CCM-042");
    expect(normalizeCommissionnaireCode("ccm 42")).toBe("CCM-042");
    expect(normalizeCommissionnaireCode("CCM042")).toBe("CCM-042");
  });

  it("refuse un code client (CCL) ou un format libre", () => {
    expect(normalizeCommissionnaireCode("CCL-042")).toBeNull();
    expect(normalizeCommissionnaireCode("042")).toBeNull();
  });
});
