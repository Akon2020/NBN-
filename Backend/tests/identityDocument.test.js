import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import request from "supertest";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import app from "../app.js";
import {
  User,
  Property,
  RentalProperty,
  PropertyPhone,
  Person,
  Bailleur,
  Alert,
  TimelineEvent,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const responsablePhone = `+24392${String(suffix).slice(-7)}`;

const createdUserIds = [];
const createdPropertyIds = [];
let adminCookies;
let operationsCookies;
let idBailleur;
let storedPath;
let pngBuffer;

const payload = {
  remplisseur: "RESPONSABLE",
  typeMission: "COLLECTE_BIEN",
  typeOperation: "RENT",
  propertyType: "APPARTEMENT",
  commune: "KADUTU",
  quartier: "Nyakaliba",
  avenue: "Kadurhu",
  prix: "300",
  modalitePaiement: "MENSUEL",
  bedrooms: "2",
  toilets: "1",
  livingRooms: "1",
  kitchens: "1",
  depots: "0",
  hasElectricity: true,
  responsableStatut: "PROPRIETAIRE",
  responsableNom: `Proprietaire Piece ${suffix}`,
  responsablePhone,
  responsableEmail: `proprietaire.piece.${suffix}@gmail.com`,
  responsableDisponibiliteVisite: "OUI",
  responsableAccepteCommission: "OUI",
};

const submitWithDocument = (body, buffer, filename = "cni.png", contentType = "image/png") =>
  request(app)
    .post("/api/property-collections")
    .field("data", JSON.stringify(body))
    .attach("pieceIdentite", buffer, { filename, contentType });

const login = async (email) => {
  const res = await request(app).post("/api/auth/login").send({ email, password: testPassword });
  return res.headers["set-cookie"];
};

beforeAll(async () => {
  pngBuffer = await sharp({
    create: { width: 60, height: 40, channels: 3, background: "#14294A" },
  })
    .png()
    .toBuffer();

  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());
  const admin = await User.create({
    fullName: "Admin Piece Test",
    email: `admin.piece.${suffix}@nbn.test`,
    password: hashed,
    role: "admin",
    status: "ACTIVE",
  });
  const operations = await User.create({
    fullName: "Operations Piece Test",
    email: `operations.piece.${suffix}@nbn.test`,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(admin.idUser, operations.idUser);
  adminCookies = await login(admin.email);
  operationsCookies = await login(operations.email);
});

afterAll(async () => {
  if (createdPropertyIds.length) {
    await TimelineEvent.destroy({ where: { entityType: "PROPERTY", entityId: createdPropertyIds } });
    await Alert.destroy({ where: { relatedEntityType: "Property", relatedEntityId: createdPropertyIds } });
    await PropertyPhone.destroy({ where: { idProperty: createdPropertyIds } });
    await RentalProperty.destroy({ where: { idProperty: createdPropertyIds } });
    await Property.destroy({ where: { idProperty: createdPropertyIds }, force: true });
  }
  const person = await Person.findOne({ where: { phone: responsablePhone } });
  if (person) {
    if (person.idDocumentPath) fs.rmSync(path.resolve(person.idDocumentPath), { force: true });
    await Bailleur.destroy({ where: { idPerson: person.idPerson } });
    await person.destroy();
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("Pièce d'identité du responsable", () => {
  it("est obligatoire quand le responsable remplit lui-même le formulaire", async () => {
    const res = await request(app).post("/api/property-collections").send(payload);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/carte d'identité/);
  });

  it("refuse un fichier qui n'est ni une image ni un PDF", async () => {
    const res = await submitWithDocument(payload, Buffer.from("pas une image"), "cni.txt", "text/plain");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Format non accepté/);
  });

  it("est enregistrée hors du dossier public, recompressée en JPEG", async () => {
    const res = await submitWithDocument(payload, pngBuffer);

    expect(res.status).toBe(201);
    createdPropertyIds.push(res.body.data.idProperty);

    const person = await Person.findOne({ where: { phone: responsablePhone } });
    storedPath = person.idDocumentPath;
    expect(storedPath).toMatch(/^private\/identity-documents\/[\w-]+\.jpg$/);
    expect(person.idDocumentMimeType).toBe("image/jpeg");
    expect(fs.existsSync(path.resolve(storedPath))).toBe(true);

    // Aucune route statique ne sert ce dossier.
    const direct = await request(app).get(`/${storedPath}`);
    expect(direct.status).toBe(404);

    const bailleur = await Bailleur.findOne({ where: { idPerson: person.idPerson } });
    idBailleur = bailleur.idBailleur;
  });

  it("la fiche du bailleur signale le document sans jamais exposer son chemin", async () => {
    const res = await request(app).get(`/api/bailleurs/${idBailleur}`).set("Cookie", adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.person.hasIdDocument).toBe(true);
    expect(res.body.person).not.toHaveProperty("idDocumentPath");
  });

  it("n'est consultable qu'avec bailleurs:identity:read", async () => {
    const denied = await request(app)
      .get(`/api/bailleurs/${idBailleur}/piece-identite`)
      .set("Cookie", operationsCookies);
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/bailleurs/${idBailleur}/piece-identite`)
      .set("Cookie", adminCookies);
    expect(allowed.status).toBe(200);
    expect(allowed.headers["content-type"]).toMatch(/image\/jpeg/);
    expect(allowed.headers["cache-control"]).toMatch(/no-store/);
  });

  it("une nouvelle soumission avec le même téléphone ne remplace pas le document existant", async () => {
    const other = await sharp({
      create: { width: 30, height: 30, channels: 3, background: "#F25414" },
    })
      .png()
      .toBuffer();

    const dir = path.resolve(path.dirname(storedPath));
    const relativeDir = path.dirname(storedPath);
    const filesBefore = new Set(fs.readdirSync(dir));

    const res = await submitWithDocument(payload, other);
    expect(res.status).toBe(201);
    createdPropertyIds.push(res.body.data.idProperty);

    const person = await Person.findOne({ where: { phone: responsablePhone } });
    expect(person.idDocumentPath).toBe(storedPath);

    // Le fichier écarté n'est pas laissé orphelin sur le disque. D'autres
    // fichiers de tests écrivent en parallèle dans ce dossier : on vérifie
    // que chaque nouveau fichier appartient bien à une personne.
    const newFiles = fs.readdirSync(dir).filter((name) => !filesBefore.has(name));
    for (const name of newFiles) {
      const owner = await Person.count({ where: { idDocumentPath: `${relativeDir}/${name}` } });
      expect(owner, `fichier orphelin : ${name}`).toBe(1);
    }
  });
});
