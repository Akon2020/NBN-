import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import request from "supertest";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import app from "../app.js";
import { User, Person, Bailleur, Property, PropertyPhone, TimelineEvent } from "../models/index.model.js";

const suffix = Date.now();
const users = {};
const cookies = {};
const bailleurs = {};
let property;

const createBailleur = async (key, fullName, priorite) => {
  const person = await Person.create({ fullName: `${fullName} ${suffix}` });
  bailleurs[key] = await Bailleur.create({ idPerson: person.idPerson, type: "PROPRIETAIRE", priorite });
};

beforeAll(async () => {
  const hashed = await bcrypt.hash("TestPass@123", await bcrypt.genSalt());
  for (const role of ["operations", "marketing"]) {
    users[role] = await User.create({
      fullName: `${role} portfolio ${suffix}`,
      email: `${role}.portfolio.${suffix}@nbn.test`,
      password: hashed,
      role,
      status: "ACTIVE",
    });
    const res = await request(app).post("/api/auth/login").send({ email: users[role].email, password: "TestPass@123" });
    cookies[role] = res.headers["set-cookie"];
  }

  await createBailleur("zeta", "Zeta Standard", "STANDARD");
  await createBailleur("yves", "Yves Vip", "VIP");
  await createBailleur("alpha", "Alpha Vip", "VIP");

  property = await Property.create({
    category: "RENT",
    propertyType: "MAISON",
    commune: "BAGIRA",
    quartier: "Cahi",
    price: 400,
    idBailleur: bailleurs.zeta.idBailleur,
  });
  await PropertyPhone.create({ idProperty: property.idProperty, phoneNumber: "+243970000001" });
});

afterAll(async () => {
  await PropertyPhone.destroy({ where: { idProperty: property.idProperty } });
  await Property.destroy({ where: { idProperty: property.idProperty }, force: true });
  for (const bailleur of Object.values(bailleurs)) {
    const fresh = await Bailleur.findByPk(bailleur.idBailleur);
    if (fresh?.photo) fs.rmSync(path.resolve(fresh.photo), { force: true });
    await TimelineEvent.destroy({ where: { entityType: "BAILLEUR", entityId: bailleur.idBailleur } });
    await Bailleur.destroy({ where: { idBailleur: bailleur.idBailleur } });
    await Person.destroy({ where: { idPerson: bailleur.idPerson } });
  }
  await User.destroy({ where: { idUser: Object.values(users).map((user) => user.idUser) } });
});

describe("Liste des bailleurs", () => {
  it("classe par priorité puis par ordre alphabétique, avec le nombre de biens", async () => {
    const res = await request(app).get("/api/bailleurs").set("Cookie", cookies.operations);
    expect(res.status).toBe(200);

    const ours = res.body.data.filter((b) =>
      Object.values(bailleurs).some((created) => created.idBailleur === b.idBailleur)
    );
    expect(ours.map((b) => b.person.fullName)).toEqual([
      `Alpha Vip ${suffix}`,
      `Yves Vip ${suffix}`,
      `Zeta Standard ${suffix}`,
    ]);
    expect(ours.find((b) => b.idBailleur === bailleurs.zeta.idBailleur).propertiesCount).toBe(1);
    expect(ours.find((b) => b.idBailleur === bailleurs.alpha.idBailleur).propertiesCount).toBe(0);
  });

  it("« Aperçu » renvoie les biens à l'actif du bailleur", async () => {
    const res = await request(app)
      .get(`/api/bailleurs/${bailleurs.zeta.idBailleur}/properties`)
      .set("Cookie", cookies.operations);
    expect(res.status).toBe(200);
    expect(res.body.data.map((p) => p.idProperty)).toEqual([property.idProperty]);
  });
});

describe("Profil d'un bailleur", () => {
  it("refuse une priorité inconnue (400)", async () => {
    const res = await request(app)
      .patch(`/api/bailleurs/${bailleurs.zeta.idBailleur}`)
      .set("Cookie", cookies.operations)
      .send({ priorite: "OR" });
    expect(res.status).toBe(400);
  });

  it("met à jour le profil et l'identité, téléphone normalisé", async () => {
    const res = await request(app)
      .patch(`/api/bailleurs/${bailleurs.zeta.idBailleur}`)
      .set("Cookie", cookies.operations)
      .send({ priorite: "PREMIUM", type: "GERANT", fullName: `Zeta Gerant ${suffix}`, phone: "0977 000 111" });

    expect(res.status).toBe(200);
    expect(res.body.data.priorite).toBe("PREMIUM");
    expect(res.body.data.type).toBe("GERANT");
    expect(res.body.data.person.fullName).toBe(`Zeta Gerant ${suffix}`);
    expect(res.body.data.person.phone).toBe("+243977000111");
  });

  it("remplace la photo, compressée sous uploads/", async () => {
    const image = await sharp({ create: { width: 80, height: 80, channels: 3, background: "#14294A" } })
      .png()
      .toBuffer();
    const res = await request(app)
      .post(`/api/bailleurs/${bailleurs.alpha.idBailleur}/photo`)
      .set("Cookie", cookies.operations)
      .attach("image", image, { filename: "photo.png", contentType: "image/png" });

    expect(res.status).toBe(200);
    expect(res.body.data.photo).toMatch(/^uploads\/images\/.+\.png$/);
    expect(fs.existsSync(path.resolve(res.body.data.photo))).toBe(true);
  });
});

describe("Confidentialité du lien bien ↔ bailleur", () => {
  it("un rôle sans bailleurs:read ne voit ni le bailleur ni les numéros du bien", async () => {
    const res = await request(app).get(`/api/properties/${property.idProperty}`).set("Cookie", cookies.marketing);
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("idBailleur");
    expect(res.body).not.toHaveProperty("phones");
  });

  it("un rôle qui gère les bailleurs les voit", async () => {
    const res = await request(app).get(`/api/properties/${property.idProperty}`).set("Cookie", cookies.operations);
    expect(res.status).toBe(200);
    expect(res.body.idBailleur).toBe(bailleurs.zeta.idBailleur);
    expect(res.body.phones).toHaveLength(1);
  });
});
