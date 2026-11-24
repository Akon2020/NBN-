import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import app from "../app.js";
import { Property, PropertyImage, User } from "../models/index.model.js";
import { deleteFile } from "../utils/deletefile.js";

// P1.9 : accès de Marketing et Juridique, vérifié côté API.
const suffix = Date.now();
const cookies = {};
const userIds = [];
let property;

beforeAll(async () => {
  const password = "TestPass@123";
  const hashed = await bcrypt.hash(password, 4);
  for (const role of ["marketing", "juridique", "tresorerie"]) {
    const user = await User.create({ fullName: `${role} P19`, email: `${role}.p19.${suffix}@nbn.test`, password: hashed, role, status: "ACTIVE" });
    userIds.push(user.idUser);
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password });
    cookies[role] = res.headers["set-cookie"];
  }
  property = await Property.create({ category: "RENT", propertyType: "MAISON", price: 400 });
});

afterAll(async () => {
  const images = await PropertyImage.findAll({ where: { idProperty: property.idProperty } });
  for (const image of images) await deleteFile(image.image).catch(() => {});
  await PropertyImage.destroy({ where: { idProperty: property.idProperty } });
  await Property.destroy({ where: { idProperty: property.idProperty }, force: true });
  await User.destroy({ where: { idUser: userIds } });
});

describe.each(["marketing", "juridique"])("P1.9 - rôle %s", (role) => {
  it("consulte les bailleurs, sans pouvoir en ajouter (consultation seule par défaut)", async () => {
    expect((await request(app).get("/api/bailleurs").set("Cookie", cookies[role])).status).toBe(200);
    const create = await request(app).post("/api/bailleurs").set("Cookie", cookies[role]).send({});
    expect(create.status).toBe(403);
  });

  it("consulte le pipeline client et les demandes reçues", async () => {
    expect((await request(app).get("/api/clients").set("Cookie", cookies[role])).status).toBe(200);
    expect((await request(app).get("/api/rental-requests").set("Cookie", cookies[role])).status).toBe(200);
  });

  it("ajoute une photo à un bien de la galerie, sans pouvoir modifier le bien", async () => {
    const image = await sharp({ create: { width: 30, height: 20, channels: 3, background: "#f25414" } }).jpeg().toBuffer();
    const upload = await request(app)
      .post(`/api/properties/${property.idProperty}/images`)
      .set("Cookie", cookies[role])
      .attach("image", image, { filename: `p19-${role}.jpg`, contentType: "image/jpeg" });
    expect(upload.status).toBe(201);

    const edit = await request(app)
      .patch(`/api/properties/${property.idProperty}`)
      .set("Cookie", cookies[role])
      .send({ price: 1 });
    expect(edit.status).toBe(403);
  });
});

describe("P1.9 - un autre rôle reste exclu", () => {
  it("la trésorerie ne gère pas les médias des biens", async () => {
    const res = await request(app).post(`/api/properties/${property.idProperty}/images`).set("Cookie", cookies.tresorerie);
    expect(res.status).toBe(403);
  });
});
