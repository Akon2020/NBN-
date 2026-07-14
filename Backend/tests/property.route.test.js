import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, Property } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPropertyIds = [];

let operationsEmail;
let tresorerieEmail;
let communicationEmail;

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  operationsEmail = `operations.prop.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Property Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  tresorerieEmail = `tresorerie.prop.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie Property Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  createdUserIds.push(tresorerie.idUser);

  communicationEmail = `communication.prop.${suffix}@nbn.test`;
  const communication = await User.create({
    fullName: "Communication Property Test",
    email: communicationEmail,
    password: hashed,
    role: "communication",
    status: "ACTIVE",
  });
  createdUserIds.push(communication.idUser);
});

afterAll(async () => {
  if (createdPropertyIds.length) {
    await Property.destroy({ where: { idProperty: createdPropertyIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

const loginAs = async (email) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: testPassword });
  expect(res.status).toBe(200);
  return res.headers["set-cookie"];
};

describe("BACK-G05/G07 - CRUD Property", () => {
  it("operations peut créer un bien à louer avec un statut réel", async () => {
    const cookies = await loginAs(operationsEmail);
    const res = await request(app)
      .post("/api/properties")
      .set("Cookie", cookies)
      .send({
        category: "RENT",
        propertyType: "APPARTEMENT",
        quartier: "Ibanda",
        price: 500,
        margin: 50,
        statut: "DISPONIBLE",
        unit: "MONTH",
        guarantee: 1000,
        phones: ["+243900000001", "+243900000002"],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.statut).toBe("DISPONIBLE");
    expect(res.body.data.rentalDetails).toBeTruthy();
    createdPropertyIds.push(res.body.data.idProperty);
  });

  it("un bien à louer sans unit est refusé", async () => {
    const cookies = await loginAs(operationsEmail);
    const res = await request(app)
      .post("/api/properties")
      .set("Cookie", cookies)
      .send({ category: "RENT", propertyType: "MAISON" });
    expect(res.status).toBe(400);
  });

  it("communication ne peut pas créer de bien (property:manage manquant)", async () => {
    const cookies = await loginAs(communicationEmail);
    const res = await request(app)
      .post("/api/properties")
      .set("Cookie", cookies)
      .send({ category: "SALE", propertyType: "TERRAIN_PLAT" });
    expect(res.status).toBe(403);
  });

  it("le filtre par statut fonctionne (corrige SEC-G04 définitivement)", async () => {
    const cookies = await loginAs(operationsEmail);
    const res = await request(app)
      .get("/api/properties/statut/DISPONIBLE")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(
      res.body.propertiesInfo.some((p) => createdPropertyIds.includes(p.idProperty))
    ).toBe(true);
  });

  it("BACK-G03 : tresorerie voit margin, communication ne le voit pas", async () => {
    const idProperty = createdPropertyIds[0];

    const tresorerieCookies = await loginAs(tresorerieEmail);
    const withMargin = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Cookie", tresorerieCookies);
    expect(withMargin.status).toBe(200);
    expect(withMargin.body.margin).toBeTruthy();

    const communicationCookies = await loginAs(communicationEmail);
    const withoutMargin = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Cookie", communicationCookies);
    expect(withoutMargin.status).toBe(200);
    expect(withoutMargin.body.margin).toBeUndefined();
  });
});

describe("BACK-G07 - Favoris", () => {
  it("un utilisateur peut ajouter puis retirer un favori", async () => {
    const cookies = await loginAs(operationsEmail);
    const idProperty = createdPropertyIds[0];

    const addRes = await request(app)
      .post("/api/favorites")
      .set("Cookie", cookies)
      .send({ idProperty });
    expect(addRes.status).toBe(201);

    const listRes = await request(app).get("/api/favorites").set("Cookie", cookies);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((f) => f.idProperty === idProperty)).toBe(true);

    const removeRes = await request(app)
      .delete(`/api/favorites/${idProperty}`)
      .set("Cookie", cookies);
    expect(removeRes.status).toBe(200);
  });
});
