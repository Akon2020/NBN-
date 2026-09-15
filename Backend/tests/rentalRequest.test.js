import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Person,
  Client,
  RentalRequest,
  Alert,
  TimelineEvent,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const phone = `+24399${String(suffix).slice(-7)}`;

const createdUserIds = [];
const createdPersonIds = [];
const createdClientIds = [];
const createdRequestIds = [];

let operationsEmail;

const basePayload = {
  fullName: `Client Demande ${suffix}`,
  phone,
  // Domaine réel : la route vérifie les enregistrements MX. Un DNS lent
  // ou absent (CI hors ligne) n'invalide jamais l'adresse.
  email: `client.demande.${suffix}@gmail.com`,
  typeClient: "PARTICULIER",
  canalContact: "WHATSAPP",
  typesBien: ["APPARTEMENT", "STUDIO"],
  usageBien: "HABITATION",
  ville: "BUKAVU",
  commune: "IBANDA",
  // Saisie en minuscules : le quartier officiel doit être retenu.
  quartier: "nyalukemba",
  avenues: "Evariste Baganda, Mimoza",
  budgetMin: 150,
  loyerMax: 300,
  devise: "USD",
  modalitePaiement: "AVANCE_1_GARANTIE_3",
  urgence: "1_MOIS",
  typeOccupants: "COUPLE",
  elementsParticuliers: ["AUCUNE"],
  orienteParAgent: true,
  codeCommissionnaire: "ccm 42",
  conditionsAccepted: true,
};

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());
  operationsEmail = `operations.rentalreq.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations RentalRequest Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);
});

afterAll(async () => {
  if (createdRequestIds.length) {
    await RentalRequest.destroy({ where: { idRentalRequest: createdRequestIds } });
  }
  if (createdClientIds.length) {
    await TimelineEvent.destroy({ where: { entityType: "CLIENT", entityId: createdClientIds } });
    await Alert.destroy({ where: { relatedEntityType: "Client", relatedEntityId: createdClientIds } });
    await Client.destroy({ where: { idClient: createdClientIds }, force: true });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("Formulaire public de demande de location", () => {
  it("refuse une soumission sans acceptation des conditions (400)", async () => {
    const res = await request(app)
      .post("/api/rental-requests")
      .send({ ...basePayload, conditionsAccepted: false });

    expect(res.status).toBe(400);
  });

  it("refuse une soumission sans nom ni téléphone (400)", async () => {
    const res = await request(app)
      .post("/api/rental-requests")
      .send({ conditionsAccepted: true });

    expect(res.status).toBe(400);
  });

  it.each([
    ["un e-mail mal formé", { email: "client@gmail" }, /e-mail/],
    ["un téléphone incomplet", { phone: "+24397710" }, /téléphone/],
    ["sans « comment nous avez-vous connus »", { canalContact: undefined }, /connus/],
    ["un quartier hors de la commune", { quartier: "Nyamugo" }, /quartier/],
    ["sans avenue", { avenues: "" }, /avenue/],
    ["un budget minimum supérieur au maximum", { budgetMin: 500 }, /minimum/],
    ["sans modalité de paiement", { modalitePaiement: undefined }, /modalité/],
    ["« Autre » occupants sans nombre", { typeOccupants: "AUTRE" }, /nombre d'occupants/],
    ["sans réponse à l'orientation", { orienteParAgent: undefined }, /orienté/],
    ["un code client CCL au lieu d'un CCM", { codeCommissionnaire: "CCL-042" }, /CCM-042/],
  ])("refuse %s (400) avec un message explicite", async (_, override, message) => {
    const res = await request(app)
      .post("/api/rental-requests")
      .send({ ...basePayload, ...override });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(message);
  });

  it("crée sans authentification la demande, la Person, le Client sur le pipeline, et alerte l'équipe", async () => {
    const res = await request(app).post("/api/rental-requests").send(basePayload);

    expect(res.status).toBe(201);
    expect(res.body.data.dossierNumber).toMatch(/^CLI-\d{4}-\d{6}$/);
    createdRequestIds.push(res.body.data.idRentalRequest);

    const stored = await RentalRequest.findByPk(res.body.data.idRentalRequest);
    expect(stored.conditionsAcceptedAt).not.toBeNull();
    // Les champs multi-valeurs voyagent en JSON, jamais aplatis en chaîne.
    expect(stored.typesBien).toEqual(["APPARTEMENT", "STUDIO"]);

    const client = await Client.findByPk(stored.idClient, {
      include: [{ model: Person, as: "person" }],
    });
    createdClientIds.push(client.idClient);
    createdPersonIds.push(client.idPerson);

    expect(client.statutPipeline).toBe("NOUVEAU");
    expect(client.type).toBe("LOCATAIRE");
    expect(client.person.phone).toBe(phone);
    // Correspondances vers le vocabulaire CRM.
    expect(client.besoinUsage).toBe("HABITATION");
    // Orienté par un commissionnaire : la source commerciale le reflète.
    expect(client.source).toBe("COMMISSIONNAIRE");
    expect(client.sourceCommissionnaireCode).toBe("CCM-042");
    expect(Number(client.budgetMin)).toBe(150);
    expect(Number(client.budgetMax)).toBe(300);
    expect(client.person.email).toBe(basePayload.email);

    // Valeurs normalisées sur la trace de la demande.
    expect(stored.quartier).toBe("Nyalukemba");
    expect(stored.codeCommissionnaire).toBe("CCM-042");
    expect(stored.modalitePaiement).toBe("AVANCE_1_GARANTIE_3");
    expect(stored.typeOccupants).toBe("COUPLE");

    const alert = await Alert.findOne({
      where: { type: "rental_request:new", relatedEntityId: client.idClient },
    });
    expect(alert).not.toBeNull();
  });

  it("une seconde demande du même téléphone ne duplique ni la Person ni le Client, et ne fait pas reculer le pipeline", async () => {
    const existingClient = await Client.findByPk(createdClientIds[0]);
    await existingClient.update({ statutPipeline: "NEGOCIATION" });

    const res = await request(app)
      .post("/api/rental-requests")
      .send({ ...basePayload, loyerMax: 450 });

    expect(res.status).toBe(201);
    createdRequestIds.push(res.body.data.idRentalRequest);

    const persons = await Person.findAll({ where: { phone } });
    expect(persons).toHaveLength(1);

    const clients = await Client.findAll({ where: { idPerson: persons[0].idPerson } });
    expect(clients).toHaveLength(1);

    await existingClient.reload();
    expect(existingClient.statutPipeline).toBe("NEGOCIATION");
    // Le besoin exprimé, lui, est bien rafraîchi.
    expect(Number(existingClient.budgetMax)).toBe(450);
  });

  it("la liste des demandes est réservée aux rôles avec clients:read", async () => {
    const anonymous = await request(app).get("/api/rental-requests");
    expect(anonymous.status).toBe(401);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: operationsEmail, password: testPassword });
    expect(login.status).toBe(200);

    const listed = await request(app)
      .get("/api/rental-requests")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(listed.status).toBe(200);
    expect(listed.body.data.some((r) => r.idRentalRequest === createdRequestIds[0])).toBe(true);
  });
});
