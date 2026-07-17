import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, Property, MarginSetting, MarginHistory } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPropertyIds = [];

let tresorerieEmail;
let operationsEmail;

const loginCache = new Map();
const loginAs = async (email) => {
  if (loginCache.has(email)) {
    return loginCache.get(email);
  }
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: testPassword });
  expect(res.status).toBe(200);
  loginCache.set(email, res);
  return res;
};

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  tresorerieEmail = `tresorerie.margin.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie Margin Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  createdUserIds.push(tresorerie.idUser);

  operationsEmail = `operations.margin.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Margin Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);
});

afterAll(async () => {
  if (createdPropertyIds.length) {
    await MarginHistory.destroy({ where: { idProperty: createdPropertyIds } });
    await Property.destroy({ where: { idProperty: createdPropertyIds }, force: true });
  }
  await MarginHistory.destroy({ where: { propertyType: "TERRAIN_PLAT" } });
  await MarginSetting.update(
    { defaultPercentage: 10, updatedBy: null },
    { where: { propertyType: "TERRAIN_PLAT" } }
  );
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("GOAL 9 - Gestion automatique des marges", () => {
  it("calcule automatiquement la marge d'un bien créé selon le pourcentage global de son type", async () => {
    const tresorerieLogin = await loginAs(tresorerieEmail);
    const operationsLogin = await loginAs(operationsEmail);

    const settingsRes = await request(app)
      .get("/api/margin-settings")
      .set("Authorization", `Bearer ${tresorerieLogin.body.data.token}`);
    expect(settingsRes.status).toBe(200);
    const terrainSetting = settingsRes.body.data.find((s) => s.propertyType === "TERRAIN_PLAT");
    expect(terrainSetting).toBeDefined();

    const propRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`)
      .send({ category: "SALE", propertyType: "TERRAIN_PLAT", price: 1000, quartier: "Ibanda" });
    expect(propRes.status).toBe(201);
    const idProperty = propRes.body.data.idProperty;
    createdPropertyIds.push(idProperty);

    // operations n'a pas property:margin:read : margin masqué sur sa
    // propre réponse de création, on relit en tresorerie pour vérifier.
    const reread = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Authorization", `Bearer ${tresorerieLogin.body.data.token}`);
    const expectedMargin = Number(
      (1000 * (Number(terrainSetting.defaultPercentage) / 100)).toFixed(2)
    );
    expect(Number(reread.body.margin)).toBe(expectedMargin);
  });

  it("un rôle sans property:margin:read ne voit jamais margin ni marginOverridePercentage", async () => {
    const login = await loginAs(operationsEmail);
    const idProperty = createdPropertyIds[0];
    const res = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.body.margin).toBeUndefined();
    expect(res.body.marginOverridePercentage).toBeUndefined();
  });

  it("un override par bien prime sur le défaut du type et se recalcule automatiquement", async () => {
    const login = await loginAs(tresorerieEmail);
    const idProperty = createdPropertyIds[0];

    const overrideRes = await request(app)
      .patch(`/api/properties/${idProperty}/margin-override`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ percentage: 25 });
    expect(overrideRes.status).toBe(200);
    expect(Number(overrideRes.body.data.margin)).toBe(250);
    expect(Number(overrideRes.body.data.marginOverridePercentage)).toBe(25);

    const history = await MarginHistory.findAll({ where: { idProperty, scope: "PROPERTY" } });
    expect(history.length).toBe(1);
    expect(Number(history[0].newPercentage)).toBe(25);

    const timelineRes = await request(app)
      .get(`/api/timeline/PROPERTY/${idProperty}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(
      timelineRes.body.data.some((e) => e.eventType === "MARGIN_OVERRIDE_CHANGED")
    ).toBe(true);
  });

  it("un changement du pourcentage global ne touche jamais un bien avec override, seulement les autres du même type", async () => {
    const login = await loginAs(tresorerieEmail);
    const operationsLogin = await loginAs(operationsEmail);
    const idOverridden = createdPropertyIds[0]; // a un override à 25%

    const secondPropRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`)
      .send({ category: "SALE", propertyType: "TERRAIN_PLAT", price: 2000, quartier: "Kadutu" });
    const idNonOverridden = secondPropRes.body.data.idProperty;
    createdPropertyIds.push(idNonOverridden);

    const updateRes = await request(app)
      .patch("/api/margin-settings/TERRAIN_PLAT")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ percentage: 15 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.propertiesRecalculated).toBeGreaterThanOrEqual(1);

    const overriddenAfter = await Property.findByPk(idOverridden);
    expect(Number(overriddenAfter.margin)).toBe(250); // inchangé (toujours 25% de 1000)
    expect(Number(overriddenAfter.marginOverridePercentage)).toBe(25);

    const nonOverriddenAfter = await Property.findByPk(idNonOverridden);
    expect(Number(nonOverriddenAfter.margin)).toBe(300); // 15% de 2000

    const globalHistory = await MarginHistory.findAll({
      where: { scope: "GLOBAL", propertyType: "TERRAIN_PLAT" },
    });
    expect(globalHistory.length).toBeGreaterThanOrEqual(1);
  });

  it("un rôle sans property:margin:manage ne peut pas changer le pourcentage global (403)", async () => {
    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .patch("/api/margin-settings/TERRAIN_PLAT")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ percentage: 20 });
    expect(res.status).toBe(403);
  });

  it("retirer l'override (percentage: null) fait retomber le bien sur le défaut global courant", async () => {
    const login = await loginAs(tresorerieEmail);
    const idOverridden = createdPropertyIds[0];

    const clearRes = await request(app)
      .patch(`/api/properties/${idOverridden}/margin-override`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ percentage: null });
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.data.marginOverridePercentage).toBeFalsy();
    expect(Number(clearRes.body.data.margin)).toBe(150); // 15% (défaut courant) de 1000
  });
});
