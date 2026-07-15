import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Caisse,
  CaisseBalance,
  Payment,
  CashMovement,
  LedgerEntry,
  PaymentMethod,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdCaisseIds = [];
const createdPaymentIds = [];

let tresorerieEmail;
let operationsEmail;
let caisseId;
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

  tresorerieEmail = `tresorerie.payment.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie Payment Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  createdUserIds.push(tresorerie.idUser);

  operationsEmail = `operations.payment.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Payment Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  const caisse = await Caisse.create({ label: `Caisse Payment Test ${suffix}` });
  caisseId = caisse.idCaisse;
  createdCaisseIds.push(caisseId);
  await CaisseBalance.bulkCreate([
    { idCaisse: caisseId, currencyCode: "USD", balance: 0 },
    { idCaisse: caisseId, currencyCode: "CDF", balance: 0 },
  ]);

  const method = await PaymentMethod.findOne({ where: { code: "CASH" } });
  cashMethodId = method.idPaymentMethod;
});

afterAll(async () => {
  if (createdPaymentIds.length) {
    await LedgerEntry.destroy({
      where: { idCashMovement: (await CashMovement.findAll({ where: { idPayment: createdPaymentIds } })).map((m) => m.idCashMovement) },
    });
    await CashMovement.destroy({ where: { idPayment: createdPaymentIds } });
    await Payment.destroy({ where: { idPayment: createdPaymentIds } });
  }
  if (createdCaisseIds.length) {
    await CaisseBalance.destroy({ where: { idCaisse: createdCaisseIds } });
    await Caisse.destroy({ where: { idCaisse: createdCaisseIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G14 - Payment → CashMovement → LedgerEntry (append-only)", () => {
  it("un encaissement augmente le solde de la caisse et produit une LedgerEntry", async () => {
    const login = await loginAs(tresorerieEmail);

    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        type: "ENCAISSEMENT",
        amount: 500,
        currencyCode: "USD",
        idCaisse: caisseId,
        idPaymentMethod: cashMethodId,
        description: "Encaissement loyer test",
      });

    expect(res.status).toBe(201);
    createdPaymentIds.push(res.body.data.idPayment);

    const balance = await CaisseBalance.findOne({
      where: { idCaisse: caisseId, currencyCode: "USD" },
    });
    expect(Number(balance.balance)).toBe(500);

    const cashMovement = await CashMovement.findOne({
      where: { idPayment: res.body.data.idPayment },
    });
    expect(cashMovement.type).toBe("ENTREE");

    const ledgerEntry = await LedgerEntry.findOne({
      where: { idCashMovement: cashMovement.idCashMovement },
    });
    expect(Number(ledgerEntry.balanceAfter)).toBe(500);
  });

  it("un décaissement refuse un solde insuffisant (400)", async () => {
    const login = await loginAs(tresorerieEmail);

    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        type: "DECAISSEMENT",
        amount: 1000000,
        currencyCode: "USD",
        idCaisse: caisseId,
        idPaymentMethod: cashMethodId,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/solde insuffisant/i);
  });

  it("un décaissement dans la limite du solde diminue le solde correctement", async () => {
    const login = await loginAs(tresorerieEmail);

    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        type: "DECAISSEMENT",
        amount: 150,
        currencyCode: "USD",
        idCaisse: caisseId,
        idPaymentMethod: cashMethodId,
        description: "Décaissement test",
      });

    expect(res.status).toBe(201);
    createdPaymentIds.push(res.body.data.idPayment);

    const balance = await CaisseBalance.findOne({
      where: { idCaisse: caisseId, currencyCode: "USD" },
    });
    expect(Number(balance.balance)).toBe(350); // 500 - 150
  });

  it("un rôle sans payments:manage ne peut pas enregistrer de paiement (403)", async () => {
    const login = await loginAs(operationsEmail);

    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        type: "ENCAISSEMENT",
        amount: 10,
        currencyCode: "USD",
        idCaisse: caisseId,
        idPaymentMethod: cashMethodId,
      });

    expect(res.status).toBe(403);
  });

  it("operations a payments:read (lecture du ledger) mais pas payments:manage", async () => {
    const login = await loginAs(operationsEmail);

    const res = await request(app)
      .get("/api/payments/ledger")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
  });

  it("l'annulation d'un paiement crée une contre-écriture et restaure le solde, sans modifier l'écriture d'origine", async () => {
    const login = await loginAs(tresorerieEmail);

    const create = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        type: "ENCAISSEMENT",
        amount: 200,
        currencyCode: "CDF",
        idCaisse: caisseId,
        idPaymentMethod: cashMethodId,
      });
    createdPaymentIds.push(create.body.data.idPayment);

    const balanceBeforeCancel = await CaisseBalance.findOne({
      where: { idCaisse: caisseId, currencyCode: "CDF" },
    });
    expect(Number(balanceBeforeCancel.balance)).toBe(200);

    const originalLedgerCountBefore = await LedgerEntry.count({
      where: { idCaisse: caisseId, currencyCode: "CDF" },
    });

    const cancel = await request(app)
      .patch(`/api/payments/${create.body.data.idPayment}/annuler`)
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(cancel.status).toBe(200);
    expect(cancel.body.data.statut).toBe("cancelled");

    const balanceAfterCancel = await CaisseBalance.findOne({
      where: { idCaisse: caisseId, currencyCode: "CDF" },
    });
    expect(Number(balanceAfterCancel.balance)).toBe(0);

    // Une nouvelle écriture a été ajoutée (contre-écriture), l'ancienne
    // n'a jamais été touchée — append-only, pas de modification.
    const ledgerCountAfter = await LedgerEntry.count({
      where: { idCaisse: caisseId, currencyCode: "CDF" },
    });
    expect(ledgerCountAfter).toBe(originalLedgerCountBefore + 1);

    const reversalPayment = await Payment.findOne({
      where: { reversalOfPaymentId: create.body.data.idPayment },
    });
    expect(reversalPayment).not.toBeNull();
    expect(reversalPayment.type).toBe("DECAISSEMENT");
    createdPaymentIds.push(reversalPayment.idPayment);
  });
});
