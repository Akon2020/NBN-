import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Person,
  Commissionnaire,
  CommissionnaireIncident,
  AppSetting,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPersonIds = [];
const createdCommissionnaireIds = [];

let technologiqueEmail;
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

  technologiqueEmail = `technologique.settings.${suffix}@nbn.test`;
  const technologique = await User.create({
    fullName: "Technologique Settings Test",
    email: technologiqueEmail,
    password: hashed,
    role: "technologique",
    status: "ACTIVE",
  });
  createdUserIds.push(technologique.idUser);

  operationsEmail = `operations.settings.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Settings Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);
});

afterAll(async () => {
  // Restaure l'état par défaut du paramètre global partagé — d'autres
  // fichiers de test (commissionnaire.test.js) supposent le comportement
  // par défaut (scoring activé).
  await AppSetting.update(
    { value: JSON.stringify(true), updatedBy: null },
    { where: { key: "commissionnaire.scoringEnabled" } }
  );
  if (createdCommissionnaireIds.length) {
    await CommissionnaireIncident.destroy({
      where: { idCommissionnaire: createdCommissionnaireIds },
    });
    await Commissionnaire.destroy({ where: { idCommissionnaire: createdCommissionnaireIds } });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("GOAL 13 - Centre de configuration", () => {
  it("liste les paramètres avec leurs vraies valeurs typées (pas des chaînes JSON brutes)", async () => {
    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .get("/api/settings")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(200);

    const maxItems = res.body.data.find((s) => s.key === "cart.maxItems");
    expect(maxItems).toBeDefined();
    expect(typeof maxItems.value).toBe("number");

    const companyInfo = res.body.data.find((s) => s.key === "company.info");
    expect(typeof companyInfo.value).toBe("object");
    expect(companyInfo.value.name).toBeDefined();
  });

  it("modifie un paramètre existant (settings:manage requis)", async () => {
    const login = await loginAs(technologiqueEmail);
    const res = await request(app)
      .patch("/api/settings/cart.maxItems")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ value: 15 });
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe(15);

    // remis à sa valeur d'origine pour ne pas polluer d'autres tests
    await request(app)
      .patch("/api/settings/cart.maxItems")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ value: 10 });
  });

  it("un rôle sans settings:manage ne peut pas modifier un paramètre (403)", async () => {
    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .patch("/api/settings/cart.maxItems")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ value: 99 });
    expect(res.status).toBe(403);
  });

  it("404 sur une clé de paramètre inexistante (jamais créée à la volée)", async () => {
    const login = await loginAs(technologiqueEmail);
    const res = await request(app)
      .patch("/api/settings/inexistant.cle")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ value: 1 });
    expect(res.status).toBe(404);
  });

  it("désactiver commissionnaire.scoringEnabled empêche un incident d'impacter le score, sans empêcher son enregistrement", async () => {
    const login = await loginAs(technologiqueEmail);

    const person = await Person.create({
      fullName: `Commissionnaire Settings Test ${suffix}`,
      phone: "+243900000500",
    });
    createdPersonIds.push(person.idPerson);
    const commissionnaire = await Commissionnaire.create({
      idPerson: person.idPerson,
      code: `COM-SET-${suffix}`,
      scoreDiscipline: 20,
    });
    createdCommissionnaireIds.push(commissionnaire.idCommissionnaire);

    const operationsLogin = await loginAs(operationsEmail);

    await request(app)
      .patch("/api/settings/commissionnaire.scoringEnabled")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ value: false });

    const incidentRes = await request(app)
      .post(`/api/commissionnaires/${commissionnaire.idCommissionnaire}/incidents`)
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`)
      .send({ type: "RETARD", impactDiscipline: 10 });
    expect(incidentRes.status).toBe(201);

    const incidents = await CommissionnaireIncident.findAll({
      where: { idCommissionnaire: commissionnaire.idCommissionnaire },
    });
    expect(incidents.length).toBe(1); // toujours enregistré

    const unchanged = await Commissionnaire.findByPk(commissionnaire.idCommissionnaire);
    expect(Number(unchanged.scoreDiscipline)).toBe(20); // score inchangé

    await request(app)
      .patch("/api/settings/commissionnaire.scoringEnabled")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ value: true });

    const secondIncidentRes = await request(app)
      .post(`/api/commissionnaires/${commissionnaire.idCommissionnaire}/incidents`)
      .set("Authorization", `Bearer ${operationsLogin.body.data.token}`)
      .send({ type: "RETARD", impactDiscipline: 10 });
    expect(secondIncidentRes.status).toBe(201);

    const affected = await Commissionnaire.findByPk(commissionnaire.idCommissionnaire);
    expect(Number(affected.scoreDiscipline)).toBe(10); // scoring réactivé, impact appliqué
  });
});
