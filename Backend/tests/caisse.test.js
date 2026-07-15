import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, Caisse, CaisseBalance, ExchangeRate, Currency } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdCaisseIds = [];
const createdExchangeRateIds = [];

let tresorerieEmail;
let operationsEmail;
let juridiqueEmail;

const loginCache = new Map();

// `/api/auth/login` est rate-limité (SEC-G07, 10 tentatives/15 min) — un
// cache par email évite de gaspiller ce quota partagé entre fichiers de
// test (même pattern que tests/commissionnaire.test.js).
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

  tresorerieEmail = `tresorerie.caisse.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie Caisse Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  createdUserIds.push(tresorerie.idUser);

  operationsEmail = `operations.caisse.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Caisse Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  juridiqueEmail = `juridique.caisse.${suffix}@nbn.test`;
  const juridique = await User.create({
    fullName: "Juridique Caisse Test",
    email: juridiqueEmail,
    password: hashed,
    role: "juridique",
    status: "ACTIVE",
  });
  createdUserIds.push(juridique.idUser);
});

afterAll(async () => {
  if (createdExchangeRateIds.length) {
    await ExchangeRate.destroy({ where: { idExchangeRate: createdExchangeRateIds } });
  }
  if (createdCaisseIds.length) {
    await CaisseBalance.destroy({ where: { idCaisse: createdCaisseIds } });
    await Caisse.destroy({ where: { idCaisse: createdCaisseIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G12 - Caisses multiples et devises", () => {
  it("la trésorerie peut créer une caisse, un solde à zéro est initialisé pour chaque devise active", async () => {
    const login = await loginAs(tresorerieEmail);

    const res = await request(app)
      .post("/api/caisses")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ label: `Caisse principale ${suffix}` });

    expect(res.status).toBe(201);
    expect(res.body.data.label).toBe(`Caisse principale ${suffix}`);
    createdCaisseIds.push(res.body.data.idCaisse);

    const currencyCodes = res.body.data.balances.map((b) => b.currencyCode).sort();
    expect(currencyCodes).toEqual(["CDF", "USD"]);
    for (const balance of res.body.data.balances) {
      expect(Number(balance.balance)).toBe(0);
    }
  });

  it("un rôle sans treasury:manage ne peut pas créer de caisse", async () => {
    const login = await loginAs(juridiqueEmail);

    const res = await request(app)
      .post("/api/caisses")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ label: "Caisse refusée" });

    expect(res.status).toBe(403);
  });

  it("operations a treasury:read mais pas treasury:manage (lecture seule)", async () => {
    const login = await loginAs(operationsEmail);

    const readRes = await request(app)
      .get("/api/caisses")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(readRes.status).toBe(200);

    const writeRes = await request(app)
      .post("/api/caisses")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ label: "Caisse refusée operations" });
    expect(writeRes.status).toBe(403);
  });

  it("la trésorerie peut clôturer une caisse", async () => {
    const login = await loginAs(tresorerieEmail);

    const create = await request(app)
      .post("/api/caisses")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ label: `Caisse à clôturer ${suffix}` });
    createdCaisseIds.push(create.body.data.idCaisse);

    const close = await request(app)
      .patch(`/api/caisses/${create.body.data.idCaisse}`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statut: "CLOTUREE" });

    expect(close.status).toBe(200);
    expect(close.body.data.statut).toBe("CLOTUREE");
  });

  it("les soldes ne mélangent jamais deux devises (une ligne CaisseBalance par devise)", async () => {
    const login = await loginAs(tresorerieEmail);

    const create = await request(app)
      .post("/api/caisses")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ label: `Caisse multi-devises ${suffix}` });
    createdCaisseIds.push(create.body.data.idCaisse);

    const balances = await CaisseBalance.findAll({
      where: { idCaisse: create.body.data.idCaisse },
    });
    expect(balances.length).toBe(2);
    expect(new Set(balances.map((b) => b.currencyCode))).toEqual(new Set(["USD", "CDF"]));
  });
});

describe("BACK-G12 - Devises et taux de change", () => {
  it("une devise en double est refusée (409)", async () => {
    const login = await loginAs(tresorerieEmail);

    const res = await request(app)
      .post("/api/currencies")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ code: "USD", label: "Dollar", symbol: "$" });

    expect(res.status).toBe(409);
  });

  it("la trésorerie peut enregistrer un taux de change tracé", async () => {
    const login = await loginAs(tresorerieEmail);

    const res = await request(app)
      .post("/api/exchange-rates")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        fromCurrency: "USD",
        toCurrency: "CDF",
        rate: 2800,
        date: "2026-07-15",
        source: "Banque centrale du Congo",
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.rate)).toBe(2800);
    expect(res.body.data.from.code).toBe("USD");
    expect(res.body.data.to.code).toBe("CDF");
    createdExchangeRateIds.push(res.body.data.idExchangeRate);
  });
});
