import { describe, it, expect } from "vitest";
import { BUKAVU_LOCATIONS, resolveQuartier } from "../shared/bukavuLocations.js";

describe("Référentiel des quartiers de Bukavu", () => {
  it("couvre les trois communes", () => {
    expect(Object.keys(BUKAVU_LOCATIONS).sort()).toEqual(["BAGIRA", "IBANDA", "KADUTU"]);
  });

  it("retient les orthographes validées par l'agence", () => {
    expect(BUKAVU_LOCATIONS.KADUTU.Nyakaliba).toContain("Kadurhu");
    expect(BUKAVU_LOCATIONS.KADUTU.Nyakaliba).not.toContain("Kadhuru");
    expect(BUKAVU_LOCATIONS.IBANDA.Nyalukemba).toContain("Evariste Baganda");
    expect(BUKAVU_LOCATIONS.IBANDA.Nyalukemba).not.toContain("Évariste Baganda");
  });

  it("retrouve un quartier quelle que soit la casse", () => {
    expect(resolveQuartier("IBANDA", "nyalukemba")).toBe("Nyalukemba");
  });

  it("refuse un quartier qui n'appartient pas à la commune", () => {
    expect(resolveQuartier("IBANDA", "Nyamugo")).toBeNull();
    expect(resolveQuartier("INCONNUE", "Nyalukemba")).toBeNull();
  });
});
