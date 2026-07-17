import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Caisse,
  CaisseBalance,
  CaisseTransfer,
  CashMovement,
  LedgerEntry,
  Payment,
  PaymentMethod,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdCaisseIds = [];

let tresorerieEmail;
let operationsEmail;
let cashMethodId;

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

  tresorerieEmail = `tresorerie.transfer.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie Transfer Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  createdUserIds.push(tresorerie.idUser);

  operationsEmail = `operations.transfer.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Transfer Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  const method = await PaymentMethod.findOne({ where: { code: "CASH" } });
  cashMethodId = method.idPaymentMethod;
});

afterAll(async () => {
  if (createdCaisseIds.length) {
    await LedgerEntry.destroy({ where: { idCaisse: createdCaisseIds } });
    await CashMovement.destroy({ where: { idCaisse: createdCaisseIds } });
    await CaisseTransfer.destroy({
      where: { idCaisseSource: createdCaisseIds },
    });
    await Payment.destroy({ where: { idCaisse: createdCaisseIds } });
    await CaisseBalance.destroy({ where: { idCaisse: createdCaisseIds } });
    await Caisse.destroy({ where: { idCaisse: createdCaisseIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

const createCaisse = async (token, label) => {
  const res = await request(app)
    .post("/api/caisses")
    .set("Authorization", `Bearer ${token}`)
    .send({ label });
  createdCaisseIds.push(res.body.data.idCaisse);
  return res.body.data.idCaisse;
};

const fund = async (token, idCaisse, amount) => {
  const res = await request(app)
    .post("/api/payments")
    .set("Authorization", `Bearer ${token}`)
    .send({
      type: "ENCAISSEMENT",
      amount,
      currencyCode: "USD",
      idCaisse,
      idPaymentMethod: cashMethodId,
      description: "Financement de test",
    });
  expect(res.status).toBe(201);
};

describe("GOAL 10 - Virements entre caisses", () => {
  it("effectue un virement, met à jour les deux soldes, et journalise deux LedgerEntry", async () => {
    const login = await loginAs(tresorerieEmail);
    const token = login.body.data.token;

    const idSource = await createCaisse(token, `Caisse Source ${suffix}`);
    const idDestination = await createCaisse(token, `Caisse Destination ${suffix}`);
    await fund(token, idSource, 1000);

    const transferRes = await request(app)
      .post("/api/caisses/transfers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idCaisseSource: idSource,
        idCaisseDestination: idDestination,
        currencyCode: "USD",
        amount: 400,
        description: "Rééquilibrage",
      });
    expect(transferRes.status).toBe(201);
    expect(transferRes.body.data.caisseSource.idCaisse).toBe(idSource);
    expect(transferRes.body.data.caisseDestination.idCaisse).toBe(idDestination);

    const sourceBalance = await CaisseBalance.findOne({
      where: { idCaisse: idSource, currencyCode: "USD" },
    });
    const destBalance = await CaisseBalance.findOne({
      where: { idCaisse: idDestination, currencyCode: "USD" },
    });
    expect(Number(sourceBalance.balance)).toBe(600);
    expect(Number(destBalance.balance)).toBe(400);

    const idTransfer = transferRes.body.data.idCaisseTransfer;
    const movements = await CashMovement.findAll({ where: { idCaisseTransfer: idTransfer } });
    expect(movements.length).toBe(2);
    expect(movements.some((m) => m.type === "SORTIE" && m.idCaisse === idSource)).toBe(true);
    expect(movements.some((m) => m.type === "ENTREE" && m.idCaisse === idDestination)).toBe(true);
  });

  it("refuse un virement qui viderait la caisse source en négatif", async () => {
    const login = await loginAs(tresorerieEmail);
    const token = login.body.data.token;

    const idSource = await createCaisse(token, `Caisse Pauvre ${suffix}`);
    const idDestination = await createCaisse(token, `Caisse Riche ${suffix}`);
    await fund(token, idSource, 100);

    const res = await request(app)
      .post("/api/caisses/transfers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idCaisseSource: idSource,
        idCaisseDestination: idDestination,
        currencyCode: "USD",
        amount: 500,
      });
    expect(res.status).toBe(400);

    const balance = await CaisseBalance.findOne({
      where: { idCaisse: idSource, currencyCode: "USD" },
    });
    expect(Number(balance.balance)).toBe(100); // inchangé
  });

  it("refuse un virement vers/depuis une caisse clôturée", async () => {
    const login = await loginAs(tresorerieEmail);
    const token = login.body.data.token;

    const idSource = await createCaisse(token, `Caisse Cloturee ${suffix}`);
    const idDestination = await createCaisse(token, `Caisse Ouverte ${suffix}`);
    await fund(token, idSource, 500);

    await request(app)
      .patch(`/api/caisses/${idSource}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ statut: "CLOTUREE" });

    const res = await request(app)
      .post("/api/caisses/transfers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idCaisseSource: idSource,
        idCaisseDestination: idDestination,
        currencyCode: "USD",
        amount: 100,
      });
    expect(res.status).toBe(400);
  });

  it("refuse la même caisse comme source et destination", async () => {
    const login = await loginAs(tresorerieEmail);
    const token = login.body.data.token;
    const idCaisse = await createCaisse(token, `Caisse Seule ${suffix}`);

    const res = await request(app)
      .post("/api/caisses/transfers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idCaisseSource: idCaisse,
        idCaisseDestination: idCaisse,
        currencyCode: "USD",
        amount: 10,
      });
    expect(res.status).toBe(400);
  });

  it("un rôle sans treasury:manage ne peut pas effectuer de virement (403)", async () => {
    const tresorerieLogin = await loginAs(tresorerieEmail);
    const idSource = await createCaisse(tresorerieLogin.body.data.token, `Caisse A ${suffix}`);
    const idDestination = await createCaisse(tresorerieLogin.body.data.token, `Caisse B ${suffix}`);

    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .post("/api/caisses/transfers")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        idCaisseSource: idSource,
        idCaisseDestination: idDestination,
        currencyCode: "USD",
        amount: 10,
      });
    expect(res.status).toBe(403);
  });

  it("liste les virements filtrés par caisse impliquée", async () => {
    const login = await loginAs(tresorerieEmail);
    const token = login.body.data.token;

    const idSource = await createCaisse(token, `Caisse Filtre A ${suffix}`);
    const idDestination = await createCaisse(token, `Caisse Filtre B ${suffix}`);
    await fund(token, idSource, 200);

    await request(app)
      .post("/api/caisses/transfers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idCaisseSource: idSource,
        idCaisseDestination: idDestination,
        currencyCode: "USD",
        amount: 50,
      });

    const listRes = await request(app)
      .get(`/api/caisses/transfers?idCaisse=${idDestination}`)
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(
      listRes.body.data.some((tr) => tr.caisseDestination.idCaisse === idDestination)
    ).toBe(true);
  });
});

describe("GOAL 10 - Export du ledger de caisse", () => {
  it("exporte le ledger en CSV et Excel", async () => {
    const login = await loginAs(tresorerieEmail);
    const token = login.body.data.token;
    const idCaisse = await createCaisse(token, `Caisse Export ${suffix}`);
    await fund(token, idCaisse, 250);

    const csvRes = await request(app)
      .get(`/api/reports/caisses/${idCaisse}/ledger?format=csv`)
      .set("Authorization", `Bearer ${token}`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers["content-type"]).toContain("text/csv");
    expect(csvRes.text).toContain("ENTREE");

    const xlsxRes = await request(app)
      .get(`/api/reports/caisses/${idCaisse}/ledger?format=xlsx`)
      .set("Authorization", `Bearer ${token}`);
    expect(xlsxRes.status).toBe(200);
    expect(xlsxRes.headers["content-type"]).toContain("spreadsheetml");
  });

  it("404 sur une caisse inexistante", async () => {
    const login = await loginAs(tresorerieEmail);
    const res = await request(app)
      .get("/api/reports/caisses/999999999/ledger?format=csv")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(404);
  });
});
