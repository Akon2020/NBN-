import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, Property, RentalProperty, MarginSetting, MarginHistory } from "../models/index.model.js";

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

  tresorerieEmail = `tresorerie.staytype.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie StayType Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  createdUserIds.push(tresorerie.idUser);

  operationsEmail = `operations.staytype.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations StayType Test",
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
    await RentalProperty.destroy({ where: { idProperty: createdPropertyIds } });
    await Property.destroy({ where: { idProperty: createdPropertyIds }, force: true });
  }
  await MarginHistory.destroy({ where: { propertyType: "APPARTEMENT" } });
  await MarginSetting.update(
    { defaultPercentage: 20, updatedBy: null },
    { where: { propertyType: "APPARTEMENT", stayType: "COURT_SEJOUR" } }
  );
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("GOAL 12 - Courte/longue durée : marge selon le type de séjour", () => {
  it("un bien loué à la journée (unit=DAY) utilise le pourcentage COURT_SEJOUR, pas LONGUE_DUREE", async () => {
    const tresorerieLogin = await loginAs(tresorerieEmail);
    const operationsLogin = await loginAs(operationsEmail);

    const settingsRes = await request(app)
      .get("/api/margin-settings")
      .set("Authorization", `Bearer ${tresorerieLogin.body.data.token}`);
    const shortStaySetting = settingsRes.body.data.find(
      (s) => s.propertyType === "APPARTEMENT" && s.stayType === "COURT_SEJOUR"
    );
    expect(shortStaySetting).toBeDefined();

    const propRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`)
      .send({
        category: "RENT",
        propertyType: "APPARTEMENT",
        price: 100,
        quartier: "Ibanda",
        unit: "DAY",
      });
    expect(propRes.status).toBe(201);
    const idProperty = propRes.body.data.idProperty;
    createdPropertyIds.push(idProperty);

    const reread = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Authorization", `Bearer ${tresorerieLogin.body.data.token}`);
    const expectedMargin = Number(
      (100 * (Number(shortStaySetting.defaultPercentage) / 100)).toFixed(2)
    );
    expect(Number(reread.body.margin)).toBe(expectedMargin);
  });

  it("un bien loué au mois (unit=MONTH) utilise le pourcentage LONGUE_DUREE", async () => {
    const tresorerieLogin = await loginAs(tresorerieEmail);
    const operationsLogin = await loginAs(operationsEmail);

    const settingsRes = await request(app)
      .get("/api/margin-settings")
      .set("Authorization", `Bearer ${tresorerieLogin.body.data.token}`);
    const longStaySetting = settingsRes.body.data.find(
      (s) => s.propertyType === "APPARTEMENT" && s.stayType === "LONGUE_DUREE"
    );

    const propRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`)
      .send({
        category: "RENT",
        propertyType: "APPARTEMENT",
        price: 500,
        quartier: "Nyawera",
        unit: "MONTH",
      });
    const idProperty = propRes.body.data.idProperty;
    createdPropertyIds.push(idProperty);

    const reread = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Authorization", `Bearer ${tresorerieLogin.body.data.token}`);
    const expectedMargin = Number(
      (500 * (Number(longStaySetting.defaultPercentage) / 100)).toFixed(2)
    );
    expect(Number(reread.body.margin)).toBe(expectedMargin);
  });

  it("passer un bien de MONTH à DAY recalcule automatiquement la marge, même sans changement de prix", async () => {
    const tresorerieLogin = await loginAs(tresorerieEmail);
    const operationsLogin = await loginAs(operationsEmail);

    const propRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`)
      .send({
        category: "RENT",
        propertyType: "APPARTEMENT",
        price: 200,
        quartier: "Kadutu",
        unit: "MONTH",
      });
    const idProperty = propRes.body.data.idProperty;
    createdPropertyIds.push(idProperty);

    const beforeSwitch = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Authorization", `Bearer ${tresorerieLogin.body.data.token}`);
    const longMargin = Number(beforeSwitch.body.margin);

    const switchRes = await request(app)
      .patch(`/api/properties/${idProperty}`)
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`)
      .send({ unit: "DAY" });
    expect(switchRes.status).toBe(200);

    const afterSwitch = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Authorization", `Bearer ${tresorerieLogin.body.data.token}`);
    const shortMargin = Number(afterSwitch.body.margin);

    expect(shortMargin).not.toBe(longMargin);

    const settingsRes = await request(app)
      .get("/api/margin-settings")
      .set("Authorization", `Bearer ${tresorerieLogin.body.data.token}`);
    const shortStaySetting = settingsRes.body.data.find(
      (s) => s.propertyType === "APPARTEMENT" && s.stayType === "COURT_SEJOUR"
    );
    expect(shortMargin).toBe(
      Number((200 * (Number(shortStaySetting.defaultPercentage) / 100)).toFixed(2))
    );
  });

  it("changer le pourcentage COURT_SEJOUR ne touche jamais les biens loués au mois du même type", async () => {
    const tresorerieLogin = await loginAs(tresorerieEmail);
    const operationsLogin = await loginAs(operationsEmail);

    const dailyRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`)
      .send({ category: "RENT", propertyType: "APPARTEMENT", price: 80, quartier: "Ibanda", unit: "DAY" });
    const idDaily = dailyRes.body.data.idProperty;
    createdPropertyIds.push(idDaily);

    const monthlyRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`)
      .send({ category: "RENT", propertyType: "APPARTEMENT", price: 300, quartier: "Ibanda", unit: "MONTH" });
    const idMonthly = monthlyRes.body.data.idProperty;
    createdPropertyIds.push(idMonthly);

    const monthlyBefore = await Property.findByPk(idMonthly);
    const monthlyMarginBefore = Number(monthlyBefore.margin);

    const updateRes = await request(app)
      .patch("/api/margin-settings/APPARTEMENT")
      .set("Authorization", `Bearer ${tresorerieLogin.body.data.token}`)
      .send({ percentage: 35, stayType: "COURT_SEJOUR" });
    expect(updateRes.status).toBe(200);

    const dailyAfter = await Property.findByPk(idDaily);
    expect(Number(dailyAfter.margin)).toBe(28); // 35% de 80

    const monthlyAfter = await Property.findByPk(idMonthly);
    expect(Number(monthlyAfter.margin)).toBe(monthlyMarginBefore); // inchangé
  });

  it("une vente (category=SALE, sans RentalProperty) reste toujours LONGUE_DUREE quel que soit le pourcentage COURT_SEJOUR", async () => {
    const tresorerieLogin = await loginAs(tresorerieEmail);
    const operationsLogin = await loginAs(operationsEmail);

    const saleRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`)
      .send({ category: "SALE", propertyType: "APPARTEMENT", price: 10000, quartier: "Ibanda" });
    const idSale = saleRes.body.data.idProperty;
    createdPropertyIds.push(idSale);

    const settingsRes = await request(app)
      .get("/api/margin-settings")
      .set("Authorization", `Bearer ${tresorerieLogin.body.data.token}`);
    const longStaySetting = settingsRes.body.data.find(
      (s) => s.propertyType === "APPARTEMENT" && s.stayType === "LONGUE_DUREE"
    );

    const reread = await Property.findByPk(idSale);
    expect(Number(reread.margin)).toBe(
      Number((10000 * (Number(longStaySetting.defaultPercentage) / 100)).toFixed(2))
    );
  });
});
