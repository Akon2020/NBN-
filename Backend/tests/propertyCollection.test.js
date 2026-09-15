import { describe, it, expect, afterAll } from "vitest";
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
} from "../models/index.model.js";
import { serializeProperty } from "../utils/serializers/property.serializer.js";

const suffix = Date.now();
const ownerPhone = `+24390${String(suffix).slice(-7)}`;
const selfOwnerPhone = `+24391${String(suffix).slice(-7)}`;

const createdPropertyIds = [];
const createdPersonIds = [];
const createdBailleurIds = [];

// Collecte par un commissionnaire, le cas le plus complet.
const basePayload = {
  remplisseur: "COLLECTEUR",
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
  collecteurNom: `Collecteur Test ${suffix}`,
  collecteurPhone: "+243900000000",
  // Code au bon format mais attribué à personne.
  codeCommissionnaire: `ccm ${String(suffix).slice(-4)}`,
};

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
  if (createdPersonIds.length) {
    const persons = await Person.findAll({ where: { idPerson: createdPersonIds } });
    persons
      .filter((person) => person.idDocumentPath)
      .forEach((person) => fs.rmSync(path.resolve(person.idDocumentPath), { force: true }));
    await Person.destroy({ where: { idPerson: createdPersonIds } });
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
    ["un commissionnaire sans code CCM (code client CCL)", { codeCommissionnaire: "CCL-042" }, /CCM-042/],
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
    expect(property.codeCommissionnaire).toMatch(/^CCM-\d{3,4}$/);
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

    // Code au bon format mais inconnu : le bien existe, la mission reste
    // simplement non rattachée.
    expect(res.body.data.idMission).toBeNull();

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

  it("un membre de l'équipe (sans commissionnaire) n'a aucune identité à fournir", async () => {
    const res = await request(app)
      .post("/api/property-collections")
      .send({
        ...basePayload,
        parCommissionnaire: false,
        collecteurNom: "",
        collecteurPhone: "",
        codeCommissionnaire: "",
      });

    expect(res.status).toBe(201);
    const property = await trackProperty(res.body.data.idProperty);
    expect(property.codeCommissionnaire).toBeNull();
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
          parCommissionnaire: undefined,
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
