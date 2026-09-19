import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import request from "supertest";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import app from "../app.js";
import { User, Person, Bailleur, Property, TimelineEvent } from "../models/index.model.js";

const suffix = Date.now();
const phone = `+24394${String(suffix).slice(-7)}`;
let operations;
let cookies;
let idCard;
const properties = {};
let createdBailleur;

const identity = {
  type: "GERANT",
  priorite: "PREMIUM",
  fullName: `Nouveau Bailleur ${suffix}`,
  phone,
  email: `nouveau.bailleur.${suffix}@gmail.com`,
  idNumber: `CNI-${suffix}`,
};

const createWithDocument = (data, withDocument = true) => {
  const req = request(app).post("/api/bailleurs").set("Cookie", cookies).field("data", JSON.stringify(data));
  return withDocument ? req.attach("pieceIdentite", idCard, { filename: "cni.png", contentType: "image/png" }) : req;
};

beforeAll(async () => {
  idCard = await sharp({ create: { width: 50, height: 30, channels: 3, background: "#245640" } }).png().toBuffer();
  operations = await User.create({
    fullName: `Operations creation ${suffix}`,
    email: `operations.creation.${suffix}@nbn.test`,
    password: await bcrypt.hash("TestPass@123", await bcrypt.genSalt()),
    role: "operations",
    status: "ACTIVE",
  });
  const res = await request(app).post("/api/auth/login").send({ email: operations.email, password: "TestPass@123" });
  cookies = res.headers["set-cookie"];

  for (const key of ["free", "later"]) {
    properties[key] = await Property.create({ category: "RENT", propertyType: "CHAMBRE", quartier: "Panzi", price: 80 });
  }
});

afterAll(async () => {
  await Property.destroy({ where: { idProperty: Object.values(properties).map((p) => p.idProperty) }, force: true });
  if (createdBailleur) {
    const bailleur = await Bailleur.findByPk(createdBailleur.idBailleur, { include: [{ model: Person, as: "person" }] });
    if (bailleur?.person?.idDocumentPath) fs.rmSync(path.resolve(bailleur.person.idDocumentPath), { force: true });
    await TimelineEvent.destroy({ where: { entityType: "BAILLEUR", entityId: createdBailleur.idBailleur } });
    await Bailleur.destroy({ where: { idBailleur: createdBailleur.idBailleur } });
    await Person.destroy({ where: { idPerson: createdBailleur.idPerson } });
  }
  await User.destroy({ where: { idUser: operations.idUser } });
});

describe("Ajouter un bailleur", () => {
  it("exige la pièce d'identité (400)", async () => {
    const res = await createWithDocument(identity, false);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pièce d'identité/);
  });

  it("exige un téléphone valide (400)", async () => {
    const res = await createWithDocument({ ...identity, phone: "123" });
    expect(res.status).toBe(400);
  });

  it("crée le bailleur avec sa pièce et rattache un bien de la galerie", async () => {
    const res = await createWithDocument({ ...identity, idProperties: [properties.free.idProperty] });

    expect(res.status).toBe(201);
    createdBailleur = res.body.data;
    expect(createdBailleur.type).toBe("GERANT");
    expect(createdBailleur.priorite).toBe("PREMIUM");
    expect(createdBailleur.dossierNumber).toMatch(/^BAI-\d{4}-\d{6}$/);
    expect(createdBailleur.propertiesCount).toBe(1);
    expect(createdBailleur.person.hasIdDocument).toBe(true);
    expect(createdBailleur.person).not.toHaveProperty("idDocumentPath");

    await properties.free.reload();
    expect(properties.free.idBailleur).toBe(createdBailleur.idBailleur);
  });

  it("refuse un contact déjà enregistré comme bailleur (409)", async () => {
    const res = await createWithDocument({ ...identity, fullName: "Autre nom" });
    expect(res.status).toBe(409);
    expect(res.body.idBailleur).toBe(createdBailleur.idBailleur);
  });

  it("« Joindre un bien existant » depuis le profil, jamais le bien d'un autre bailleur", async () => {
    const ok = await request(app)
      .post(`/api/bailleurs/${createdBailleur.idBailleur}/properties`)
      .set("Cookie", cookies)
      .send({ idProperties: [properties.later.idProperty] });
    expect(ok.status).toBe(200);
    expect(ok.body.data.linked).toBe(1);

    const other = await Person.create({ fullName: `Autre ${suffix}` });
    const otherBailleur = await Bailleur.create({ idPerson: other.idPerson, type: "PROPRIETAIRE" });
    const taken = await request(app)
      .post(`/api/bailleurs/${otherBailleur.idBailleur}/properties`)
      .set("Cookie", cookies)
      .send({ idProperties: [properties.later.idProperty] });
    expect(taken.status).toBe(409);

    await otherBailleur.destroy();
    await other.destroy();
  });

  it("remplace la pièce d'identité depuis le profil sans laisser l'ancienne sur le disque", async () => {
    const before = await Bailleur.findByPk(createdBailleur.idBailleur, { include: [{ model: Person, as: "person" }] });
    const previousPath = before.person.idDocumentPath;

    const res = await request(app)
      .post(`/api/bailleurs/${createdBailleur.idBailleur}/piece-identite`)
      .set("Cookie", cookies)
      .attach("pieceIdentite", idCard, { filename: "cni-2.png", contentType: "image/png" });
    expect(res.status).toBe(200);

    const after = await Bailleur.findByPk(createdBailleur.idBailleur, { include: [{ model: Person, as: "person" }] });
    expect(after.person.idDocumentPath).not.toBe(previousPath);
    expect(fs.existsSync(path.resolve(previousPath))).toBe(false);
    expect(fs.existsSync(path.resolve(after.person.idDocumentPath))).toBe(true);
  });
});
