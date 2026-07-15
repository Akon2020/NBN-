import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Person,
  Client,
  Commissionnaire,
  Caisse,
  CaisseBalance,
  Commission,
  Payment,
  CashMovement,
  LedgerEntry,
  PaymentMethod,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPersonIds = [];
const createdClientIds = [];
const createdCommissionnaireIds = [];
const createdCaisseIds = [];
const createdCommissionIds = [];
const createdPaymentIds = [];

let tresorerieEmail;
let concludedClientId;
let commissionnaireCode;
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

  tresorerieEmail = `tresorerie.commission.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie Commission Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  createdUserIds.push(tresorerie.idUser);

  const clientPerson = await Person.create({
    fullName: `Client Conclu ${suffix}`,
    phone: "+243900000002",
  });
  createdPersonIds.push(clientPerson.idPerson);

  const commissionnairePerson = await Person.create({
    fullName: `Commissionnaire Source ${suffix}`,
    phone: "+243900000003",
  });
  createdPersonIds.push(commissionnairePerson.idPerson);

  commissionnaireCode = `CMR-COMM-${suffix}`;
  const commissionnaire = await Commissionnaire.create({
    idPerson: commissionnairePerson.idPerson,
    code: commissionnaireCode,
  });
  createdCommissionnaireIds.push(commissionnaire.idCommissionnaire);

  const client = await Client.create({
    idPerson: clientPerson.idPerson,
    type: "ACHETEUR",
    statutPipeline: "CONCLU",
    sourceCommissionnaireCode: commissionnaireCode,
  });
  concludedClientId = client.idClient;
  createdClientIds.push(client.idClient);

  const caisse = await Caisse.create({ label: `Caisse Commission Test ${suffix}` });
  caisseId = caisse.idCaisse;
  createdCaisseIds.push(caisseId);
  await CaisseBalance.bulkCreate([
    { idCaisse: caisseId, currencyCode: "USD", balance: 10000 },
    { idCaisse: caisseId, currencyCode: "CDF", balance: 0 },
  ]);

  const method = await PaymentMethod.findOne({ where: { code: "CASH" } });
  cashMethodId = method.idPaymentMethod;
});

afterAll(async () => {
  if (createdPaymentIds.length) {
    const movements = await CashMovement.findAll({ where: { idPayment: createdPaymentIds } });
    await LedgerEntry.destroy({
      where: { idCashMovement: movements.map((m) => m.idCashMovement) },
    });
    await CashMovement.destroy({ where: { idPayment: createdPaymentIds } });
    await Payment.destroy({ where: { idPayment: createdPaymentIds } });
  }
  if (createdCommissionIds.length) {
    await Commission.destroy({ where: { idCommission: createdCommissionIds } });
  }
  if (createdCaisseIds.length) {
    await CaisseBalance.destroy({ where: { idCaisse: createdCaisseIds } });
    await Caisse.destroy({ where: { idCaisse: createdCaisseIds } });
  }
  if (createdClientIds.length) {
    await Client.destroy({ where: { idClient: createdClientIds } });
  }
  if (createdCommissionnaireIds.length) {
    await Commissionnaire.destroy({ where: { idCommissionnaire: createdCommissionnaireIds } });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G15 - Commissions (calcul, éligibilité, paiement)", () => {
  it("calcule une commission COMMISSIONNAIRE à partir d'un taux et d'une transaction conclue", async () => {
    const login = await loginAs(tresorerieEmail);

    const res = await request(app)
      .post("/api/commissions")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        idClient: concludedClientId,
        beneficiaireType: "COMMISSIONNAIRE",
        montantTransaction: 10000,
        currencyCode: "USD",
        tauxCommission: 5,
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.montantCommission)).toBe(500);
    expect(res.body.data.statut).toBe("CALCULEE");
    expect(res.body.data.commissionnaire.code).toBe(commissionnaireCode);
    createdCommissionIds.push(res.body.data.idCommission);
  });

  it("refuse une commission sur un client dont la transaction n'est pas conclue (400)", async () => {
    const login = await loginAs(tresorerieEmail);
    const person = await Person.create({ fullName: "Client Non Conclu", phone: "+243900000004" });
    createdPersonIds.push(person.idPerson);
    const client = await Client.create({
      idPerson: person.idPerson,
      type: "ACHETEUR",
      statutPipeline: "NEGOCIATION",
    });
    createdClientIds.push(client.idClient);

    const res = await request(app)
      .post("/api/commissions")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        idClient: client.idClient,
        beneficiaireType: "AGENCE",
        montantTransaction: 5000,
        currencyCode: "USD",
        tauxCommission: 5,
      });

    expect(res.status).toBe(400);
  });

  it("marque une commission due puis la paie — le circuit Payment→CashMovement→LedgerEntry se déclenche", async () => {
    const login = await loginAs(tresorerieEmail);

    const create = await request(app)
      .post("/api/commissions")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        idClient: concludedClientId,
        beneficiaireType: "AGENCE",
        montantTransaction: 2000,
        currencyCode: "USD",
        montantCommission: 100,
      });
    createdCommissionIds.push(create.body.data.idCommission);

    const due = await request(app)
      .patch(`/api/commissions/${create.body.data.idCommission}/marquer-due`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ idCaisse: caisseId });
    expect(due.status).toBe(200);
    expect(due.body.data.statut).toBe("DUE");

    const pay = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        type: "DECAISSEMENT",
        amount: 100,
        currencyCode: "USD",
        idCaisse: caisseId,
        idPaymentMethod: cashMethodId,
        idCommission: create.body.data.idCommission,
      });
    expect(pay.status).toBe(201);
    createdPaymentIds.push(pay.body.data.idPayment);

    const commission = await Commission.findByPk(create.body.data.idCommission);
    expect(commission.statut).toBe("PAYEE");

    // idempotence : une deuxième tentative de paiement sur la même
    // commission doit être refusée (déjà payée / plus DUE).
    const secondPay = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        type: "DECAISSEMENT",
        amount: 100,
        currencyCode: "USD",
        idCaisse: caisseId,
        idPaymentMethod: cashMethodId,
        idCommission: create.body.data.idCommission,
      });
    expect(secondPay.status).toBe(400);
  });

  it("une commission AGENT sans beneficiaireUserId est refusée (400)", async () => {
    const login = await loginAs(tresorerieEmail);

    const res = await request(app)
      .post("/api/commissions")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        idClient: concludedClientId,
        beneficiaireType: "AGENT",
        montantTransaction: 1000,
        currencyCode: "USD",
        tauxCommission: 3,
      });

    expect(res.status).toBe(400);
  });
});
