import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Property,
  Person,
  Commissionnaire,
  Caisse,
  CashMovement,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";

const createdUserIds = [];
const createdPropertyIds = [];
let commissionnairePersonId;
let commissionnaireId;
let caisseId;
let cashMovementId;

let operationsEmail;
let consultantEmail;

const login = async (email) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: testPassword });
  expect(res.status).toBe(200);
  return res.body.data.token;
};

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  operationsEmail = `operations.dashcharts.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations DashCharts Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  consultantEmail = `consultant.dashcharts.${suffix}@nbn.test`;
  const consultant = await User.create({
    fullName: "Consultant DashCharts Test",
    email: consultantEmail,
    password: hashed,
    role: "consultant",
    status: "ACTIVE",
  });
  createdUserIds.push(consultant.idUser);

  const property = await Property.create({
    category: "SALE",
    propertyType: "MAISON",
    quartier: `Quartier DashCharts ${suffix}`,
    price: 5000,
    statut: "DISPONIBLE",
    createdBy: operations.idUser,
  });
  createdPropertyIds.push(property.idProperty);

  const person = await Person.create({ fullName: `Commissionnaire DashCharts ${suffix}` });
  commissionnairePersonId = person.idPerson;
  const commissionnaire = await Commissionnaire.create({
    idPerson: person.idPerson,
    code: `DC-${suffix}`,
    statut: "ACTIF",
    scoreGlobal: 90,
  });
  commissionnaireId = commissionnaire.idCommissionnaire;

  const caisse = await Caisse.create({ label: `Caisse DashCharts ${suffix}`, statut: "OUVERTE" });
  caisseId = caisse.idCaisse;
  const cashMovement = await CashMovement.create({
    idCaisse: caisseId,
    currencyCode: "USD",
    amount: 100,
    type: "ENTREE",
    createdBy: operations.idUser,
  });
  cashMovementId = cashMovement.idCashMovement;
});

afterAll(async () => {
  if (cashMovementId) await CashMovement.destroy({ where: { idCashMovement: cashMovementId } });
  if (caisseId) await Caisse.destroy({ where: { idCaisse: caisseId } });
  if (commissionnaireId) await Commissionnaire.destroy({ where: { idCommissionnaire: commissionnaireId } });
  if (commissionnairePersonId) await Person.destroy({ where: { idPerson: commissionnairePersonId } });
  if (createdPropertyIds.length) {
    await Property.destroy({ where: { idProperty: createdPropertyIds }, force: true });
  }
  if (createdUserIds.length) await User.destroy({ where: { idUser: createdUserIds } });
});

describe("GOAL 19 - Dashboard exécutif (répartitions et tendances)", () => {
  it("un rôle avec toutes les permissions de lecture reçoit tous les blocs de graphiques", async () => {
    const token = await login(operationsEmail);
    const res = await request(app)
      .get("/api/dashboard/charts")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.propertiesByType.length).toBeGreaterThan(0);
    expect(res.body.data.propertiesByStatut.length).toBeGreaterThan(0);
    expect(res.body.data.clientPipeline).toBeDefined();
    expect(res.body.data.cashflowByMonth).toBeDefined();
    expect(
      res.body.data.cashflowByMonth.some((row) => row.currencyCode === "USD" && row.type === "ENTREE")
    ).toBe(true);
    expect(res.body.data.commissionsByMonth).toBeDefined();
    expect(res.body.data.commissionnairePerformance).toBeDefined();
    expect(
      res.body.data.commissionnairePerformance.some((c) => c.idCommissionnaire === commissionnaireId)
    ).toBe(true);
  });

  it("un consultant (zéro permission de base) ne reçoit que les répartitions de biens, jamais la trésorerie ou le pipeline client", async () => {
    const token = await login(consultantEmail);
    const res = await request(app)
      .get("/api/dashboard/charts")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.propertiesByType.length).toBeGreaterThan(0);
    expect(res.body.data.clientPipeline).toBeUndefined();
    expect(res.body.data.cashflowByMonth).toBeUndefined();
    expect(res.body.data.commissionsByMonth).toBeUndefined();
    expect(res.body.data.commissionnairePerformance).toBeUndefined();
  });
});
