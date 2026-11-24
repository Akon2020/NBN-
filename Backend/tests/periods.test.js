import { describe, it, expect } from "vitest";
import { periodBounds } from "../shared/periods.js";

// 23 h 30 à Bukavu le lundi 23 novembre 2026 = 21 h 30 UTC.
const lateMonday = new Date("2026-11-23T21:30:00Z");
// 0 h 30 à Bukavu le dimanche 1er novembre 2026 = 22 h 30 UTC la veille.
const earlySunday = new Date("2026-10-31T22:30:00Z");

describe("P1.10 - bornes de période à l'heure de Bukavu (UTC+2)", () => {
  it("aujourd'hui : de minuit à minuit, heure locale", () => {
    expect(periodBounds("day", lateMonday)).toEqual({
      start: new Date("2026-11-22T22:00:00Z"),
      end: new Date("2026-11-23T22:00:00Z"),
    });
    // Déjà le 1er novembre à Bukavu alors qu'il est encore le 31 octobre en UTC.
    expect(periodBounds("day", earlySunday).start).toEqual(new Date("2026-10-31T22:00:00Z"));
  });

  it("cette semaine : du lundi au dimanche", () => {
    expect(periodBounds("week", lateMonday).start).toEqual(new Date("2026-11-22T22:00:00Z"));
    expect(periodBounds("week", earlySunday)).toEqual({
      start: new Date("2026-10-25T22:00:00Z"),
      end: new Date("2026-11-01T22:00:00Z"),
    });
  });

  it("ce mois et cette année", () => {
    expect(periodBounds("month", earlySunday)).toEqual({
      start: new Date("2026-10-31T22:00:00Z"),
      end: new Date("2026-11-30T22:00:00Z"),
    });
    expect(periodBounds("year", lateMonday)).toEqual({
      start: new Date("2025-12-31T22:00:00Z"),
      end: new Date("2026-12-31T22:00:00Z"),
    });
  });
});

describe("P1.10 - Aperçu du tableau de bord", async () => {
  const request = (await import("supertest")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const { default: app } = await import("../app.js");
  const { Property, User } = await import("../models/index.model.js");
  const suffix = Date.now();
  const created = {};

  it("compte les collectes du jour par type de la liste unique, et masque les blocs sans permission", async () => {
    const hashed = await bcrypt.hash("TestPass@123", 4);
    created.admin = await User.create({ fullName: "Admin P110", email: `admin.p110.${suffix}@nbn.test`, password: hashed, role: "admin", status: "ACTIVE" });
    created.tresorerie = await User.create({ fullName: "Treso P110", email: `treso.p110.${suffix}@nbn.test`, password: hashed, role: "tresorerie", status: "ACTIVE" });
    created.properties = await Property.bulkCreate([
      { category: "RENT", propertyType: "CHAMBRE", price: 50 },
      { category: "SALE", propertyType: "TERRAIN_PLAT", price: 5000 },
    ]);

    const login = async (user) =>
      (await request(app).post("/api/auth/login").send({ email: user.email, password: "TestPass@123" })).headers["set-cookie"];

    const before = await request(app).get("/api/dashboard/overview?period=day").set("Cookie", await login(created.admin));
    expect(before.status).toBe(200);
    expect(before.body.data.collectes.parType.CHAMBRETTE).toBeGreaterThanOrEqual(1);
    expect(before.body.data.collectes.parType.TERRAIN).toBeGreaterThanOrEqual(1);
    expect(before.body.data.demandes).toBeDefined();
    expect(before.body.data.commissionnaires).toBeDefined();

    const limited = await request(app).get("/api/dashboard/overview?period=week").set("Cookie", await login(created.tresorerie));
    expect(limited.body.data.period).toBe("week");
    expect(limited.body.data.demandes).toBeUndefined();
    expect(limited.body.data.commissionnaires).toBeUndefined();

    await Property.destroy({ where: { idProperty: created.properties.map((p) => p.idProperty) }, force: true });
    await User.destroy({ where: { idUser: [created.admin.idUser, created.tresorerie.idUser] } });
  });
});
