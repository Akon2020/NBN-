import { describe, it, expect, afterAll, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import request from "supertest";
import sharp from "sharp";
import app from "../app.js";
import {
  Property,
  RentalProperty,
  SaleProperty,
  PropertyPhone,
  Person,
  Bailleur,
  Mission,
  Alert,
  TimelineEvent,
  Commissionnaire,
  Notification,
  User,
} from "../models/index.model.js";
import { serializeProperty } from "../utils/serializers/property.serializer.js";

const suffix = Date.now();
const ownerPhone = `+24390${String(suffix).slice(-7)}`;
const selfOwnerPhone = `+24391${String(suffix).slice(-7)}`;

// Fiches terrain réelles : les codes saisis sont vérifiés en base.
const agentNumber = 900000 + (suffix % 90000);
const cmrCode = `CMR-${agentNumber}`;
const ctrCode = `CTR-${agentNumber}`;
const suspendedCode = `CMR-${agentNumber + 1}`;
const agents = {};
const extraUserIds = [];

const createdPropertyIds = [];
const createdPersonIds = [];
const createdBailleurIds = [];

// Collecte par un collecteur, bien apporté par un commissionnaire : le cas
// le plus complet.
const basePayload = {
  remplisseur: "COLLECTEUR",
  codeCollecteur: ctrCode.toLowerCase(),
  parCommissionnaire: true,
  typeMission: "COLLECTE_BIEN",
  typeOperation: "RENT",
  propertyType: "PARCELLE",
  commune: "IBANDA",
  // Saisie en minuscules : le quartier officiel doit être retenu.
  quartier: "nyalukemba",
  avenue: "Mimoza",
  prix: "250$",
  prixMinimum: "220",
  modalitePaiement: "AVANCE_1_GARANTIE_3",
  bedrooms: "3",
  toilets: "2",
  livingRooms: "1",
  kitchens: "1",
  depots: "0",
  hasElectricity: true,
  hasWater: false,
  accessibilite: "ROUTE_PRINCIPALE",
  disponibilite: "IMMEDIATE",
  etatBien: "MOYEN",
  observations: "Quartier calme",
  responsableStatut: "GERANT",
  responsableNom: `Responsable Test ${suffix}`,
  responsablePhone: ownerPhone,
  responsableEmail: `responsable.${suffix}@gmail.com`,
  responsableDisponibiliteVisite: "SUR_PROGRAMME",
  responsableAccepteCommission: "A_NEGOCIER",
  // Saisie approximative : normalisée puis vérifiée en base.
  codeCommissionnaire: cmrCode.replace("-", " "),
};

beforeAll(async () => {
  const agentUser = await User.create({
    fullName: `Commissionnaire Collecte ${suffix}`,
    email: `cmr.collecte.${suffix}@nbn.test`,
    password: "x",
    role: "commissionnaire",
    status: "ACTIVE",
  });
  agents.user = agentUser;
  const persons = await Person.bulkCreate([
    { fullName: `Commissionnaire Collecte ${suffix}`, phone: "+243970000123", idUser: agentUser.idUser },
    { fullName: `Collecteur Collecte ${suffix}`, phone: "+243970000456" },
    { fullName: `Suspendu Collecte ${suffix}`, phone: "+243970000789" },
  ]);
  agents.persons = persons;
  agents.cmr = await Commissionnaire.create({ idPerson: persons[0].idPerson, code: cmrCode, profil: "COMMISSIONNAIRE" });
  agents.ctr = await Commissionnaire.create({ idPerson: persons[1].idPerson, code: ctrCode, profil: "COLLECTEUR" });
  agents.suspended = await Commissionnaire.create({
    idPerson: persons[2].idPerson,
    code: suspendedCode,
    profil: "COMMISSIONNAIRE",
    statut: "SUSPENDU",
  });
});

const trackProperty = async (idProperty) => {
  createdPropertyIds.push(idProperty);
  const property = await Property.findByPk(idProperty);
  const bailleur = await Bailleur.findByPk(property.idBailleur);
  if (!createdBailleurIds.includes(bailleur.idBailleur)) createdBailleurIds.push(bailleur.idBailleur);
  if (!createdPersonIds.includes(bailleur.idPerson)) createdPersonIds.push(bailleur.idPerson);
  return property;
};

afterAll(async () => {
  if (createdPropertyIds.length) {
    await TimelineEvent.destroy({
      where: { entityType: "PROPERTY", entityId: createdPropertyIds },
    });
    await Alert.destroy({
      where: { relatedEntityType: "Property", relatedEntityId: createdPropertyIds },
    });
    await Mission.destroy({ where: { idProperty: createdPropertyIds }, force: true });
    await PropertyPhone.destroy({ where: { idProperty: createdPropertyIds } });
    await RentalProperty.destroy({ where: { idProperty: createdPropertyIds } });
    await SaleProperty.destroy({ where: { idProperty: createdPropertyIds } });
    await Property.destroy({ where: { idProperty: createdPropertyIds }, force: true });
  }
  if (createdBailleurIds.length) {
    await Bailleur.destroy({ where: { idBailleur: createdBailleurIds } });
  }
  await Notification.destroy({ where: { idUser: agents.user.idUser } });
  await Commissionnaire.destroy({ where: { idCommissionnaire: [agents.cmr, agents.ctr, agents.suspended].map((a) => a.idCommissionnaire) } });
  await Person.destroy({ where: { idPerson: agents.persons.map((p) => p.idPerson) } });
  await User.destroy({ where: { idUser: agents.user.idUser } });
  if (createdPersonIds.length) {
    const persons = await Person.findAll({ where: { idPerson: createdPersonIds } });
    persons
      .filter((person) => person.idDocumentPath)
      .forEach((person) => fs.rmSync(path.resolve(person.idDocumentPath), { force: true }));
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (extraUserIds.length) {
    await Alert.destroy({ where: { createdBy: extraUserIds } });
    await TimelineEvent.destroy({ where: { actorUserId: extraUserIds } });
    await User.destroy({ where: { idUser: extraUserIds } });
  }
});

describe("Formulaire de collecte de bien", () => {
  it("refuse une collecte sans savoir qui remplit le formulaire (400)", async () => {
    const res = await request(app)
      .post("/api/property-collections")
      .send({ ...basePayload, remplisseur: undefined });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/qui remplit/);
  });

  it("refuse un type d'opération invalide (400)", async () => {
    const res = await request(app)
      .post("/api/property-collections")
      .send({ ...basePayload, typeOperation: "LOCATION" });

    expect(res.status).toBe(400);
  });

  it.each([
    ["un quartier hors de la commune", { quartier: "Nyamugo" }, /quartier/],
    ["sans avenue", { avenue: "" }, /avenue/],
    ["une composition incomplète", { kitchens: undefined }, /cuisines/],
    ["une location sans modalité de paiement", { modalitePaiement: undefined }, /modalité/],
    ["un prix minimum supérieur au prix fixé", { prixMinimum: "300" }, /minimum/],
    ["un responsable sans statut", { responsableStatut: undefined }, /statut/],
    ["un commissionnaire sans code CMR (code client CCL)", { codeCommissionnaire: "CCL-042" }, /CMR-042/],
    ["un code commissionnaire inconnu", { codeCommissionnaire: "CMR-000001" }, /n'existe pas/],
    ["un commissionnaire suspendu", { codeCommissionnaire: suspendedCode }, /plus actif/],
    ["un collecteur sans code CTR", { codeCollecteur: "" }, /CTR-007/],
    ["un code collecteur inconnu", { codeCollecteur: "CTR-000001" }, /n'existe pas/],
    ["un collecteur qui ne dit pas si un commissionnaire a apporté le bien", { parCommissionnaire: undefined }, /apporté par un commissionnaire/],
    ["un responsable sans e-mail", { responsableEmail: "" }, /e-mail du responsable/],
    [
      "un responsable qui remplit sans e-mail",
      { remplisseur: "RESPONSABLE", responsableEmail: "" },
      /e-mail/,
    ],
  ])("refuse %s (400) avec un message explicite", async (_, override, message) => {
    const res = await request(app)
      .post("/api/property-collections")
      .send({ ...basePayload, ...override });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(message);
  });

  it("crée sans authentification le bien, son responsable et la marge dérivée", async () => {
    const res = await request(app).post("/api/property-collections").send(basePayload);

    expect(res.status).toBe(201);
    const property = await trackProperty(res.body.data.idProperty);

    expect(property.category).toBe("RENT");
    expect(property.propertyType).toBe("PARCELLE");
    expect(property.commune).toBe("IBANDA");
    expect(property.quartier).toBe("Nyalukemba");
    expect(property.avenue).toBe("Mimoza");
    // Le prix saisi librement ("250$") est normalisé en nombre.
    expect(Number(property.price)).toBe(250);
    expect(Number(property.prixMinimum)).toBe(220);
    expect(property.modalitePaiement).toBe("AVANCE_1_GARANTIE_3");
    // « 0 » est une réponse conservée, pas un champ vide.
    expect(property.depots).toBe(0);
    expect(property.bedrooms).toBe(3);
    expect(property.hasElectricity).toBe(true);
    expect(property.accessibilite).toBe("ROUTE_PRINCIPALE");
    expect(property.codeCommissionnaire).toBe(cmrCode);
    expect(property.codeCollecteur).toBe(ctrCode);
    // Nom du collecteur repris de sa fiche, pas de la saisie.
    expect(property.informateur).toBe(`Collecteur Collecte ${suffix}`);
    // La marge reste dérivée, jamais saisie (10 % longue durée sur PARCELLE).
    expect(Number(property.margin)).toBe(25);

    const bailleur = await Bailleur.findByPk(property.idBailleur, {
      include: [{ model: Person, as: "person" }],
    });
    expect(bailleur.type).toBe("GERANT");
    expect(bailleur.person.phone).toBe(ownerPhone);
    expect(bailleur.person.email).toBe(basePayload.responsableEmail);
    expect(bailleur.disponibiliteVisite).toBe("SUR_PROGRAMME");
    expect(bailleur.accepteCommission).toBe("A_NEGOCIER");
    expect(bailleur.dossierNumber).toMatch(/^BAI-\d{4}-\d{6}$/);

    // Mission de traçabilité rattachée au commissionnaire qui a apporté le bien.
    const mission = await Mission.findByPk(res.body.data.idMission);
    expect(mission.idCommissionnaire).toBe(agents.cmr.idCommissionnaire);

    // Le commissionnaire (compte actif) est prévenu, sans l'identité du responsable.
    const notification = await Notification.findOne({
      where: { idUser: agents.user.idUser, type: "field_agent:property_collection" },
    });
    expect(notification).not.toBeNull();
    expect(notification.message).not.toContain(basePayload.responsableNom);

    const rental = await RentalProperty.findOne({ where: { idProperty: property.idProperty } });
    expect(rental.unit).toBe("MONTH");

    const alert = await Alert.findOne({
      where: { type: "property_collection:new", relatedEntityId: property.idProperty },
    });
    expect(alert).not.toBeNull();
  });

  it("ne montre le prix minimum acceptable qu'à l'administration", async () => {
    const property = await Property.findByPk(createdPropertyIds[0]);

    const asOperations = await serializeProperty(property, { idUser: 0, role: "operations" });
    const asAdmin = await serializeProperty(property, { idUser: 0, role: "admin" });

    expect(asOperations).not.toHaveProperty("prixMinimum");
    expect(Number(asAdmin.prixMinimum)).toBe(220);
  });

  it("une seconde collecte du même responsable réutilise son bailleur sans le dupliquer", async () => {
    const res = await request(app)
      .post("/api/property-collections")
      .send({
        ...basePayload,
        typeOperation: "SALE",
        propertyType: "CHAMBRE",
        prix: "1 200",
        prixMinimum: "",
        // Une vente n'a pas de modalité de paiement locative.
        modalitePaiement: undefined,
      });

    expect(res.status).toBe(201);
    const property = await trackProperty(res.body.data.idProperty);

    const persons = await Person.findAll({ where: { phone: ownerPhone } });
    expect(persons).toHaveLength(1);
    const bailleurs = await Bailleur.findAll({ where: { idPerson: persons[0].idPerson } });
    expect(bailleurs).toHaveLength(1);

    expect(property.category).toBe("SALE");
    expect(Number(property.price)).toBe(1200);
    expect(property.modalitePaiement).toBeNull();
    const sale = await SaleProperty.findOne({ where: { idProperty: property.idProperty } });
    expect(sale).not.toBeNull();
  });

  it("un collecteur sans commissionnaire : aucun code CMR retenu", async () => {
    const res = await request(app)
      .post("/api/property-collections")
      .send({ ...basePayload, parCommissionnaire: false, codeCommissionnaire: "" });

    expect(res.status).toBe(201);
    const property = await trackProperty(res.body.data.idProperty);
    expect(property.codeCommissionnaire).toBeNull();
    expect(property.codeCollecteur).toBe(ctrCode);
  });

  it("un commissionnaire qui remplit lui-même : son code est vérifié et retenu", async () => {
    const res = await request(app)
      .post("/api/property-collections")
      .send({
        ...basePayload,
        remplisseur: "COMMISSIONNAIRE",
        codeRemplisseur: cmrCode,
        codeCollecteur: undefined,
        parCommissionnaire: undefined,
        codeCommissionnaire: undefined,
      });

    expect(res.status).toBe(201);
    const property = await trackProperty(res.body.data.idProperty);
    expect(property.codeCommissionnaire).toBe(cmrCode);
    expect(property.codeCollecteur).toBeNull();
  });

  it("vérifie un code saisi : nom de la fiche, téléphone masqué pour un visiteur", async () => {
    const ok = await request(app).get(`/api/property-collections/agents/${cmrCode.toLowerCase()}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ code: cmrCode, profil: "COMMISSIONNAIRE", fullName: `Commissionnaire Collecte ${suffix}` });
    expect(ok.body.data.phone).toBe("**********123");
    expect((await request(app).get(`/api/property-collections/agents/${ctrCode}`)).body.data.profil).toBe("COLLECTEUR");
    expect((await request(app).get(`/api/property-collections/agents/${suspendedCode}`)).status).toBe(404);
    expect((await request(app).get("/api/property-collections/agents/CCL-001")).status).toBe(400);
  });

  it("le responsable qui remplit lui-même est enregistré comme source", async () => {
    // Sa carte d'identité est alors obligatoire (voir identityDocument.test.js).
    const carteIdentite = await sharp({
      create: { width: 40, height: 25, channels: 3, background: "#245640" },
    })
      .png()
      .toBuffer();

    const res = await request(app)
      .post("/api/property-collections")
      .field(
        "data",
        JSON.stringify({
          ...basePayload,
          remplisseur: "RESPONSABLE",
          parCommissionnaire: false,
          codeCollecteur: undefined,
          responsableStatut: "PROPRIETAIRE",
          responsablePhone: selfOwnerPhone,
          responsableEmail: `proprietaire.${suffix}@gmail.com`,
        })
      )
      .attach("pieceIdentite", carteIdentite, { filename: "cni.png", contentType: "image/png" });

    expect(res.status).toBe(201);
    const property = await trackProperty(res.body.data.idProperty);
    expect(property.informateur).toMatch(/responsable du bien/);
    // Aucun collecteur ni code n'est retenu quand le responsable remplit.
    expect(property.codeCommissionnaire).toBeNull();

    const bailleur = await Bailleur.findByPk(property.idBailleur);
    expect(bailleur.type).toBe("PROPRIETAIRE");
  });
});

describe("P1.4 - Version de l'agence : profil du bailleur", () => {
  const staff = {};
  const adminPayload = () => ({
    ...basePayload,
    remplisseur: "COLLECTEUR",
    codeCollecteur: undefined,
    parCommissionnaire: false,
    codeCommissionnaire: undefined,
  });

  beforeAll(async () => {
    const bcrypt = (await import("bcryptjs")).default;
    staff.user = await User.create({
      fullName: `Ops P14 ${suffix}`,
      email: `ops.p14.${suffix}@nbn.test`,
      password: await bcrypt.hash("TestPass@123", 4),
      role: "operations",
      status: "ACTIVE",
    });
    const login = await request(app).post("/api/auth/login").send({ email: staff.user.email, password: "TestPass@123" });
    staff.cookies = login.headers["set-cookie"];
  });

  // Supprimé après les biens qu'il a créés (afterAll du fichier).
  afterAll(async () => {
    await Notification.destroy({ where: { idUser: staff.user.idUser } });
    extraUserIds.push(staff.user.idUser);
  });

  it("refuse un nouveau bailleur sans pièce d'identité, et la catégorie pour un visiteur", async () => {
    const res = await request(app)
      .post("/api/property-collections")
      .set("Cookie", staff.cookies)
      .send({ ...adminPayload(), responsablePhone: `+24392${String(suffix).slice(-7)}` });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pièce d'identité du bailleur/);

    const anonymous = await request(app).post("/api/property-collections").send({ ...basePayload, bailleurPriorite: "VIP" });
    expect(anonymous.status).toBe(403);
  });

  it("crée un nouveau bailleur VIP avec sa pièce et deux téléphones", async () => {
    const piece = await sharp({ create: { width: 30, height: 20, channels: 3, background: "#14294a" } }).png().toBuffer();
    const phone = `+24392${String(suffix).slice(-7)}`;
    const res = await request(app)
      .post("/api/property-collections")
      .set("Cookie", staff.cookies)
      .field(
        "data",
        JSON.stringify({ ...adminPayload(), responsablePhone: phone, responsablePhone2: "0997000111", bailleurPriorite: "VIP" })
      )
      .attach("pieceIdentite", piece, { filename: "cni.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    const property = await trackProperty(res.body.data.idProperty);
    const bailleur = await Bailleur.findByPk(property.idBailleur, { include: [{ model: Person, as: "person" }] });
    expect(bailleur.priorite).toBe("VIP");
    expect(bailleur.person.idDocumentPath).toBeTruthy();
    const phones = await PropertyPhone.findAll({ where: { idProperty: property.idProperty } });
    expect(phones.map((p) => p.phoneNumber).sort()).toEqual([phone, "+243997000111"].sort());
    staff.bailleurId = bailleur.idBailleur;
  });

  it("rattache un second bien au même bailleur existant, sans ressaisir son identité", async () => {
    const payload = adminPayload();
    delete payload.responsableNom;
    delete payload.responsablePhone;
    delete payload.responsableEmail;
    const res = await request(app)
      .post("/api/property-collections")
      .set("Cookie", staff.cookies)
      .send({ ...payload, idBailleur: staff.bailleurId, bailleurPriorite: "PREMIUM", propertyType: "BUREAU" });
    expect(res.status).toBe(201);
    const property = await trackProperty(res.body.data.idProperty);
    expect(property.idBailleur).toBe(staff.bailleurId);
    expect(property.propertyType).toBe("BUREAU");
    expect((await Bailleur.findByPk(staff.bailleurId)).priorite).toBe("PREMIUM");

    const search = await request(app).get(`/api/bailleurs?q=${String(suffix).slice(-7)}`).set("Cookie", staff.cookies);
    expect(search.body.data.map((b) => b.idBailleur)).toContain(staff.bailleurId);
  });

  it("un visiteur ne peut pas rattacher un bien à un bailleur existant", async () => {
    const res = await request(app).post("/api/property-collections").send({ ...basePayload, idBailleur: staff.bailleurId });
    expect(res.status).toBe(403);
  });
});
