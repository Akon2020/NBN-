import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import request from "supertest";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import app from "../app.js";
import { User, Client, Bailleur, Person } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdClientIds = [];
const createdBailleurIds = [];
const createdPersonIds = [];

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
  operationsEmail = `operations.dossier.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Dossier Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);
});

afterAll(async () => {
  if (createdClientIds.length) {
    await Client.destroy({ where: { idClient: createdClientIds }, force: true });
  }
  if (createdBailleurIds.length) {
    await Bailleur.destroy({ where: { idBailleur: createdBailleurIds } });
  }
  if (createdPersonIds.length) {
    const persons = await Person.findAll({ where: { idPerson: createdPersonIds } });
    persons
      .filter((person) => person.idDocumentPath)
      .forEach((person) => fs.rmSync(path.resolve(person.idDocumentPath), { force: true }));
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("GOAL 6 - Numéro de dossier unique", () => {
  it("génère un numéro de dossier unique et lisible à la création d'un client", async () => {
    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ fullName: `Client Dossier ${suffix}`, type: "ACHETEUR" });
    expect(res.status).toBe(201);
    createdClientIds.push(res.body.data.idClient);

    const currentYear = new Date().getFullYear();
    expect(res.body.data.dossierNumber).toMatch(new RegExp(`^CLI-${currentYear}-\\d{6}$`));
  });

  it("retrouve un client par recherche partielle de numéro de dossier", async () => {
    const login = await loginAs(operationsEmail);
    const idClient = createdClientIds[0];
    const client = await Client.findByPk(idClient);

    const res = await request(app)
      .get(`/api/clients?dossierNumber=${client.dossierNumber}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((c) => c.idClient === idClient)).toBe(true);
  });

  it("génère un numéro de dossier unique et lisible à la création d'un bailleur", async () => {
    const login = await loginAs(operationsEmail);
    // Téléphone et pièce d'identité obligatoires à la création (phase 4).
    const idCard = await sharp({ create: { width: 40, height: 25, channels: 3, background: "#14294A" } })
      .png()
      .toBuffer();
    const res = await request(app)
      .post("/api/bailleurs")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .field(
        "data",
        JSON.stringify({
          fullName: `Bailleur Dossier ${suffix}`,
          phone: `+24381${String(suffix).slice(-7)}`,
          type: "PROPRIETAIRE",
        })
      )
      .attach("pieceIdentite", idCard, { filename: "cni.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    createdBailleurIds.push(res.body.data.idBailleur);
    createdPersonIds.push(res.body.data.idPerson);

    const currentYear = new Date().getFullYear();
    expect(res.body.data.dossierNumber).toMatch(new RegExp(`^BAI-${currentYear}-\\d{6}$`));
  });
});
