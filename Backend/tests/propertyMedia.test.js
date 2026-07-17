import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import app from "../app.js";
import { User, Property, PropertyImage, PropertyVideo } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPropertyIds = [];

let operationsEmail;
let testImagePath;
let testVideoPath;

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

  operationsEmail = `operations.media.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Media Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  // Une vraie image PNG 800x600 (au-dessus du seuil de redimensionnement
  // n'est pas nécessaire pour vérifier la compression, seule une image
  // décodable par sharp est requise ici).
  testImagePath = path.join(process.cwd(), `_test-image-${suffix}.png`);
  await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .png()
    .toFile(testImagePath);

  // Un "faux" MP4 : le contrôleur ne décode jamais le contenu vidéo
  // (jamais de transcodage serveur, cf. upload.middleware.js), seul le
  // MIME déclaré et l'extension comptent pour le fileFilter multer.
  testVideoPath = path.join(process.cwd(), `_test-video-${suffix}.mp4`);
  await fs.writeFile(testVideoPath, Buffer.from("fake mp4 content for test"));
});

afterAll(async () => {
  await fs.unlink(testImagePath).catch(() => {});
  await fs.unlink(testVideoPath).catch(() => {});
  if (createdPropertyIds.length) {
    await PropertyImage.destroy({ where: { idProperty: createdPropertyIds } });
    await PropertyVideo.destroy({ where: { idProperty: createdPropertyIds } });
    await Property.destroy({ where: { idProperty: createdPropertyIds }, force: true });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("GOAL 2 - Upload de médias (images/vidéos)", () => {
  it("ajoute des images à un bien, compressées, ordonnées, et journalisées", async () => {
    const login = await loginAs(operationsEmail);

    const propRes = await request(app)
      .post("/api/properties")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ category: "SALE", propertyType: "MAISON", price: 20000 });
    const idProperty = propRes.body.data.idProperty;
    createdPropertyIds.push(idProperty);

    const uploadRes = await request(app)
      .post(`/api/properties/${idProperty}/images`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .attach("image", testImagePath)
      .attach("image", testImagePath);
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.length).toBe(2);
    expect(uploadRes.body.data[0].order).toBe(1);
    expect(uploadRes.body.data[1].order).toBe(2);

    const timelineRes = await request(app)
      .get(`/api/timeline/PROPERTY/${idProperty}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(timelineRes.body.data.some((e) => e.eventType === "MEDIA_ADDED")).toBe(true);

    const single = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(single.body.images.length).toBe(2);
  });

  it("réordonne puis supprime une image", async () => {
    const login = await loginAs(operationsEmail);
    const idProperty = createdPropertyIds[0];

    const before = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    const [first, second] = before.body.images;

    const reorderRes = await request(app)
      .patch(`/api/properties/${idProperty}/images/reorder`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ orderedIds: [second.idPropertyImage, first.idPropertyImage] });
    expect(reorderRes.status).toBe(200);
    expect(reorderRes.body.data[0].idPropertyImage).toBe(second.idPropertyImage);

    const deleteRes = await request(app)
      .delete(`/api/properties/${idProperty}/images/${first.idPropertyImage}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(deleteRes.status).toBe(200);

    const after = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(after.body.images.length).toBe(1);
    expect(after.body.images[0].idPropertyImage).toBe(second.idPropertyImage);
  });

  it("rejette un fichier image de type non autorisé", async () => {
    const login = await loginAs(operationsEmail);
    const idProperty = createdPropertyIds[0];

    const res = await request(app)
      .post(`/api/properties/${idProperty}/images`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .attach("image", testVideoPath);
    expect(res.status).toBe(400);
  });

  it("ajoute une vidéo, la réordonne, puis la supprime", async () => {
    const login = await loginAs(operationsEmail);
    const idProperty = createdPropertyIds[0];

    const uploadRes = await request(app)
      .post(`/api/properties/${idProperty}/videos`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .attach("video", testVideoPath);
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.length).toBe(1);
    const idPropertyVideo = uploadRes.body.data[0].idPropertyVideo;

    const single = await request(app)
      .get(`/api/properties/${idProperty}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(single.body.videos.length).toBe(1);

    const deleteRes = await request(app)
      .delete(`/api/properties/${idProperty}/videos/${idPropertyVideo}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(deleteRes.status).toBe(200);
  });

  it("rejette une vidéo de type non autorisé", async () => {
    const login = await loginAs(operationsEmail);
    const idProperty = createdPropertyIds[0];

    const res = await request(app)
      .post(`/api/properties/${idProperty}/videos`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .attach("video", testImagePath);
    expect(res.status).toBe(400);
  });
});
