import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
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

const suffix = Date.now();
const ownerPhone = `+24390${String(suffix).slice(-7)}`;

const createdPropertyIds = [];
const createdPersonIds = [];
const createdBailleurIds = [];

const basePayload = {
  typeMission: "COLLECTE_BIEN",
  typeOperation: "RENT",
  propertyType: "PARCELLE",
  commune: "IBANDA",
  quartier: "Nyalukemba",
  avenue: `Av. Test ${suffix}`,
  prix: "250$",
  bedrooms: "3",
  toilets: "2",
  hasElectricity: true,
  hasWater: false,
  accessibilite: "ROUTE_PRINCIPALE",
  disponibilite: "IMMEDIATE",
  etatBien: "MOYEN",
  observations: "Quartier calme",
  proprietaireNom: `Proprietaire Test ${suffix}`,
  proprietairePhone: ownerPhone,
  proprietaireDisponibiliteVisite: "SUR_PROGRAMME",
  proprietaireAccepteCommission: "A_NEGOCIER",
  collecteurNom: `Collecteur Test ${suffix}`,
  collecteurPhone: "+243900000000",
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
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
});

describe("Formulaire de collecte de bien", () => {
  it("refuse une collecte sans propriétaire (400)", async () => {
    const res = await request(app)
      .post("/api/property-collections")
      .send({ ...basePayload, proprietaireNom: "", proprietairePhone: "" });

    expect(res.status).toBe(400);
  });

  it("refuse un type d'opération invalide (400)", async () => {
    const res = await request(app)
      .post("/api/property-collections")
      .send({ ...basePayload, typeOperation: "LOCATION" });

    expect(res.status).toBe(400);
  });

  it("crée sans authentification le bien, son bailleur et la marge dérivée", async () => {
    const res = await request(app).post("/api/property-collections").send(basePayload);

    expect(res.status).toBe(201);
    createdPropertyIds.push(res.body.data.idProperty);

    const property = await Property.findByPk(res.body.data.idProperty);
    expect(property.category).toBe("RENT");
    expect(property.propertyType).toBe("PARCELLE");
    expect(property.commune).toBe("IBANDA");
    // Le prix saisi librement ("250$") est normalisé en nombre.
    expect(Number(property.price)).toBe(250);
    // Les relevés terrain sont conservés en colonnes exploitables.
    expect(property.hasElectricity).toBe(true);
    expect(property.hasWater).toBe(false);
    expect(property.accessibilite).toBe("ROUTE_PRINCIPALE");
    expect(property.etatBien).toBe("MOYEN");
    expect(property.bedrooms).toBe(3);
    // La marge reste dérivée, jamais saisie — et le nouveau type PARCELLE
    // a bien une ligne MarginSetting correspondante (10 % longue durée).
    expect(Number(property.margin)).toBe(25);

    const bailleur = await Bailleur.findByPk(property.idBailleur, {
      include: [{ model: Person, as: "person" }],
    });
    createdBailleurIds.push(bailleur.idBailleur);
    createdPersonIds.push(bailleur.idPerson);

    expect(bailleur.person.phone).toBe(ownerPhone);
    expect(bailleur.disponibiliteVisite).toBe("SUR_PROGRAMME");
    expect(bailleur.accepteCommission).toBe("A_NEGOCIER");
    expect(bailleur.dossierNumber).toMatch(/^BAI-\d{4}-\d{6}$/);

    // Un bien à louer reçoit ses détails de location (mensuel par défaut).
    const rental = await RentalProperty.findOne({ where: { idProperty: property.idProperty } });
    expect(rental.unit).toBe("MONTH");

    const alert = await Alert.findOne({
      where: { type: "property_collection:new", relatedEntityId: property.idProperty },
    });
    expect(alert).not.toBeNull();
  });

  it("une seconde collecte du même propriétaire réutilise son bailleur sans le dupliquer", async () => {
    const res = await request(app)
      .post("/api/property-collections")
      .send({ ...basePayload, typeOperation: "SALE", propertyType: "CHAMBRE", prix: "1 200" });

    expect(res.status).toBe(201);
    createdPropertyIds.push(res.body.data.idProperty);

    const persons = await Person.findAll({ where: { phone: ownerPhone } });
    expect(persons).toHaveLength(1);

    const bailleurs = await Bailleur.findAll({ where: { idPerson: persons[0].idPerson } });
    expect(bailleurs).toHaveLength(1);

    const property = await Property.findByPk(res.body.data.idProperty);
    expect(property.category).toBe("SALE");
    expect(Number(property.price)).toBe(1200);
    // Une vente reçoit ses détails de vente, jamais de RentalProperty.
    const sale = await SaleProperty.findOne({ where: { idProperty: property.idProperty } });
    expect(sale).not.toBeNull();
  });

  it("un code commissionnaire inconnu n'empêche jamais la collecte", async () => {
    const res = await request(app)
      .post("/api/property-collections")
      .send({ ...basePayload, codeCommissionnaire: `INCONNU-${suffix}` });

    expect(res.status).toBe(201);
    createdPropertyIds.push(res.body.data.idProperty);
    // Le bien existe, la mission reste simplement non rattachée.
    expect(res.body.data.idMission).toBeNull();
  });
});
