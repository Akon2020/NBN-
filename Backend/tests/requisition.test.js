import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, Caisse, CaisseBalance, Requisition } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdCaisseIds = [];
const createdRequisitionIds = [];

let tresorerieEmail;
let operationsEmail;
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

  tresorerieEmail = `tresorerie.requisition.${suffix}@nbn.test`;
  const tresorerie = await User.create({
    fullName: "Tresorerie Requisition Test",
    email: tresorerieEmail,
    password: hashed,
    role: "tresorerie",
    status: "ACTIVE",
  });
  createdUserIds.push(tresorerie.idUser);

  operationsEmail = `operations.requisition.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Requisition Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  commissionnaireEmail = `commissionnaire.requisition.${suffix}@nbn.test`;
  const commissionnaire = await User.create({
    fullName: "Commissionnaire Requisition Test",
    email: commissionnaireEmail,
    password: hashed,
    role: "commissionnaire",
    status: "ACTIVE",
  });
  createdUserIds.push(commissionnaire.idUser);

  const caisse = await Caisse.create({ label: `Caisse Requisition Test ${suffix}` });
  caisseId = caisse.idCaisse;
  createdCaisseIds.push(caisseId);
  await CaisseBalance.bulkCreate([
    { idCaisse: caisseId, currencyCode: "USD", balance: 0 },
    { idCaisse: caisseId, currencyCode: "CDF", balance: 0 },
  ]);
});

afterAll(async () => {
  if (createdRequisitionIds.length) {
    await Requisition.destroy({ where: { idRequisition: createdRequisitionIds }, force: true });
  }
  if (createdCaisseIds.length) {
    await CaisseBalance.destroy({ where: { idCaisse: createdCaisseIds } });
    await Caisse.destroy({ where: { idCaisse: createdCaisseIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G13 - Réquisitions (Saisie → Vérification → Approbation → Génération)", () => {
  it("un rôle avec requisitions:create peut soumettre une réquisition conforme", async () => {
    const login = await loginAs(operationsEmail);

    const res = await request(app)
      .post("/api/requisitions")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        idCaisse: caisseId,
        nature: "Achat de fournitures de bureau",
        quantite: 3,
        coutEstime: 150,
        currencyCode: "USD",
        justificatif: "Stock épuisé",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.statut).toBe("SOUMISE");
    expect(res.body.data.demandeur.email).toBe(operationsEmail);
    createdRequisitionIds.push(res.body.data.idRequisition);
  });

  it("rejette une soumission avec des champs obligatoires manquants (400)", async () => {
    const login = await loginAs(operationsEmail);

    const res = await request(app)
      .post("/api/requisitions")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ idCaisse: caisseId, nature: "Sans coût" });

    expect(res.status).toBe(400);
  });

  it("conformité budgétaire : refuse une devise non suivie par la caisse (400)", async () => {
    const login = await loginAs(operationsEmail);

    const res = await request(app)
      .post("/api/requisitions")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        idCaisse: caisseId,
        nature: "Devise non suivie",
        coutEstime: 100,
        currencyCode: "EUR",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/conformité budgétaire/i);
  });

  it("un rôle sans requisitions:create ne peut pas soumettre (403)", async () => {
    const login = await loginAs(commissionnaireEmail);

    const res = await request(app)
      .post("/api/requisitions")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ idCaisse: caisseId, nature: "Refusé", coutEstime: 10, currencyCode: "USD" });

    expect(res.status).toBe(403);
  });

  it("le PDF n'est pas disponible avant approbation (400)", async () => {
    const login = await loginAs(operationsEmail);
    const create = await request(app)
      .post("/api/requisitions")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ idCaisse: caisseId, nature: "En attente", coutEstime: 50, currencyCode: "USD" });
    createdRequisitionIds.push(create.body.data.idRequisition);

    const pdfRes = await request(app)
      .get(`/api/requisitions/${create.body.data.idRequisition}/pdf`)
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(pdfRes.status).toBe(400);
  });

  it("la trésorerie approuve, un code de validation unique est généré, et le PDF devient disponible", async () => {
    const opLogin = await loginAs(operationsEmail);
    const create = await request(app)
      .post("/api/requisitions")
      .set("Authorization", `Bearer ${opLogin.body.data.token}`)
      .send({ idCaisse: caisseId, nature: "À approuver", coutEstime: 200, currencyCode: "USD" });
    createdRequisitionIds.push(create.body.data.idRequisition);

    const tLogin = await loginAs(tresorerieEmail);
    const approve = await request(app)
      .patch(`/api/requisitions/${create.body.data.idRequisition}/approuver`)
      .set("Authorization", `Bearer ${tLogin.body.data.token}`);

    expect(approve.status).toBe(200);
    expect(approve.body.data.statut).toBe("APPROUVEE");
    expect(approve.body.data.validationCode).toMatch(/^REQ-\d{4}-[A-F0-9]{8}$/);

    const pdfRes = await request(app)
      .get(`/api/requisitions/${create.body.data.idRequisition}/pdf`)
      .set("Authorization", `Bearer ${tLogin.body.data.token}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
  });

  it("le rejet exige un motif", async () => {
    const opLogin = await loginAs(operationsEmail);
    const create = await request(app)
      .post("/api/requisitions")
      .set("Authorization", `Bearer ${opLogin.body.data.token}`)
      .send({ idCaisse: caisseId, nature: "À rejeter", coutEstime: 75, currencyCode: "USD" });
    createdRequisitionIds.push(create.body.data.idRequisition);

    const tLogin = await loginAs(tresorerieEmail);
    const noMotif = await request(app)
      .patch(`/api/requisitions/${create.body.data.idRequisition}/rejeter`)
      .set("Authorization", `Bearer ${tLogin.body.data.token}`);
    expect(noMotif.status).toBe(400);

    const withMotif = await request(app)
      .patch(`/api/requisitions/${create.body.data.idRequisition}/rejeter`)
      .set("Authorization", `Bearer ${tLogin.body.data.token}`)
      .send({ motifDecision: "Budget insuffisant ce mois-ci" });
    expect(withMotif.status).toBe(200);
    expect(withMotif.body.data.statut).toBe("REJETEE");
  });

  it("/mine ne retourne que les réquisitions du demandeur connecté", async () => {
    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .get("/api/requisitions/mine")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((r) => r.demandeur.email === operationsEmail)).toBe(true);
  });
});
