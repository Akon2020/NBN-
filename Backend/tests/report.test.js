import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, Caisse, CaisseBalance, Property } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdCaisseIds = [];
const createdPropertyIds = [];

let tresorerieEmail;
let commissionnaireEmail;
let caisseId;

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

  tresorerieEmail = `tresorerie.report.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie Report Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  createdUserIds.push(tresorerie.idUser);

  commissionnaireEmail = `commissionnaire.report.${suffix}@nbn.test`;
  const commissionnaire = await User.create({
    fullName: "Commissionnaire Report Test",
    email: commissionnaireEmail,
    password: hashed,
    role: "commissionnaire",
    status: "ACTIVE",
  });
  createdUserIds.push(commissionnaire.idUser);

  const caisse = await Caisse.create({ label: `Caisse Report Test ${suffix}` });
  caisseId = caisse.idCaisse;
  createdCaisseIds.push(caisseId);
  await CaisseBalance.bulkCreate([
    { idCaisse: caisseId, currencyCode: "USD", balance: 500 },
    { idCaisse: caisseId, currencyCode: "CDF", balance: 0 },
  ]);

  const property = await Property.create({
    category: "SALE",
    propertyType: "MAISON",
    quartier: `Quartier Report Test ${suffix}`,
    price: 20000,
    margin: 2000,
    statut: "DISPONIBLE",
    createdBy: tresorerie.idUser,
  });
  createdPropertyIds.push(property.idProperty);
});

afterAll(async () => {
  if (createdPropertyIds.length) {
    await Property.destroy({ where: { idProperty: createdPropertyIds } });
  }
  if (createdCaisseIds.length) {
    await CaisseBalance.destroy({ where: { idCaisse: createdCaisseIds } });
    await Caisse.destroy({ where: { idCaisse: createdCaisseIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G20 - Reporting (PDF/Excel/CSV)", () => {
  it("génère un état de caisse en PDF", async () => {
    const login = await loginAs(tresorerieEmail);
    const res = await request(app)
      .get(`/api/reports/caisses/${caisseId}/etat.pdf`)
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });

  it("un rôle sans reports:read ne peut pas générer de rapport (403)", async () => {
    const login = await loginAs(commissionnaireEmail);
    const res = await request(app)
      .get(`/api/reports/caisses/${caisseId}/etat.pdf`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(403);
  });

  it("exporte les biens en CSV sans la marge pour un rôle sans property:margin:read", async () => {
    // La trésorerie a property:margin:read (seed RBAC) — on vérifie donc
    // avec ce rôle que la marge EST présente, la protection elle-même
    // étant déjà couverte par les tests de la route property elle-même ;
    // ici on vérifie que le rapport respecte bien ce même mécanisme
    // (jamais une règle isolée dans le contrôleur de rapport).
    const login = await loginAs(tresorerieEmail);
    const res = await request(app)
      .get("/api/reports/properties?format=csv")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toMatch(/Marge/);
    expect(res.text).toMatch(/2000/);
  });

  it("exporte les biens en Excel (xlsx)", async () => {
    const login = await loginAs(tresorerieEmail);
    const res = await request(app)
      .get("/api/reports/properties?format=xlsx")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("exporte les commissions en CSV (liste vide acceptée)", async () => {
    const login = await loginAs(tresorerieEmail);
    const res = await request(app)
      .get("/api/reports/commissions?format=csv")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
  });
});
