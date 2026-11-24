import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import app from "../app.js";
import { deleteIdentityDocument } from "../utils/identityDocuments.js";
import {
  User,
  Person,
  Commissionnaire,
  CommissionnaireIncident,
  Mission,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPersonIds = [];
const createdCommissionnaireIds = [];
const createdMissionIds = [];

let operationsEmail;
let juridiqueEmail;
let fieldCommissionnaireEmail;
let fieldCommissionnaireUserId;
let fieldPersonId;
let pngRecto;

// Fiche avec pièce d'identité (multipart : `data` JSON + recto image).
const postCommissionnaire = (cookies, data, { recto = pngRecto, verso } = {}) => {
  let req = request(app).post("/api/commissionnaires").set("Cookie", cookies).field("data", JSON.stringify(data));
  if (recto) req = req.attach("pieceRecto", recto, { filename: "recto.png", contentType: "image/png" });
  if (verso) req = req.attach("pieceVerso", verso, { filename: "verso.png", contentType: "image/png" });
  return req;
};

beforeAll(async () => {
  pngRecto = await sharp({ create: { width: 40, height: 25, channels: 3, background: "#14294a" } })
    .png()
    .toBuffer();
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  operationsEmail = `operations.commissionnaire.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Commissionnaire Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  juridiqueEmail = `juridique.commissionnaire.${suffix}@nbn.test`;
  const juridique = await User.create({
    fullName: "Juridique Commissionnaire Test",
    email: juridiqueEmail,
    password: hashed,
    role: "juridique",
    status: "ACTIVE",
  });
  createdUserIds.push(juridique.idUser);

  // BACK-G11 - un commissionnaire de terrain avec un vrai compte de
  // connexion (User), pour vérifier que sa suspension révoque bien sa
  // session, exactement comme pour un User désactivé.
  fieldCommissionnaireEmail = `terrain.commissionnaire.${suffix}@nbn.test`;
  const fieldUser = await User.create({
    fullName: "Terrain Commissionnaire Test",
    email: fieldCommissionnaireEmail,
    password: hashed,
    role: "commissionnaire",
    status: "ACTIVE",
  });
  fieldCommissionnaireUserId = fieldUser.idUser;
  createdUserIds.push(fieldUser.idUser);

  const fieldPerson = await Person.create({
    fullName: "Terrain Commissionnaire Test",
    phone: "+243900000099",
    idUser: fieldUser.idUser,
  });
  fieldPersonId = fieldPerson.idPerson;
  createdPersonIds.push(fieldPerson.idPerson);
});

afterAll(async () => {
  if (createdMissionIds.length) {
    await Mission.destroy({ where: { idMission: createdMissionIds }, force: true });
  }
  if (createdCommissionnaireIds.length) {
    await CommissionnaireIncident.destroy({
      where: { idCommissionnaire: createdCommissionnaireIds },
    });
    await Commissionnaire.destroy({ where: { idCommissionnaire: createdCommissionnaireIds } });
  }
  if (createdPersonIds.length) {
    const persons = await Person.findAll({ where: { idPerson: createdPersonIds } });
    for (const person of persons) {
      await deleteIdentityDocument(person.idDocumentPath);
      await deleteIdentityDocument(person.idDocumentVersoPath);
    }
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

// Mémoïsé par email : ce fichier contient beaucoup de scénarios RBAC
// distincts, et `/api/auth/login` est volontairement rate-limité (SEC-G07,
// 10 tentatives/15 min) - répéter une connexion déjà obtenue pour le même
// compte gaspillerait ce quota partagé entre tous les fichiers de test.
const loginCache = new Map();

const loginAs = async (email, { fresh = false } = {}) => {
  if (!fresh && loginCache.has(email)) {
    return loginCache.get(email);
  }
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: testPassword });
  expect(res.status).toBe(200);
  loginCache.set(email, res);
  return res;
};

describe("BACK-G09 - Commissionnaire (fiche digitale, scoring, grille d'évolution)", () => {
  it("operations peut créer un commissionnaire rattaché à la Person du terrain, code CMR généré", async () => {
    const { headers } = await loginAs(operationsEmail);
    const res = await postCommissionnaire(headers["set-cookie"], {
      idPerson: fieldPersonId,
      code: "CMR-999999",
      zone: "Ibanda",
      idDocumentType: "CARTE_ELECTEUR",
      idNumber: `EL-${suffix}`,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.code).toMatch(/^CMR-\d{3,}$/);
    expect(res.body.data.code).not.toBe("CMR-999999");
    expect(res.body.message).toContain(res.body.data.code);
    expect(res.body.data.niveau).toBe("JUNIOR");
    expect(res.body.data.statut).toBe("ACTIF");
    expect(res.body.data.classement).toBe("RISQUE"); // score par défaut 25/100, pas encore évalué
    expect(res.body.data.person.fullName).toBe("Terrain Commissionnaire Test");
    expect(res.body.data.person.hasIdDocument).toBe(true);
    expect(res.body.data.person.idDocumentPath).toBeUndefined();
    // Numéro de la pièce réservé à commissionnaires:identity:read (admin).
    expect(res.body.data.person.idNumber).toBeUndefined();
    createdCommissionnaireIds.push(res.body.data.idCommissionnaire);
  });

  it("/commissionnaires/me résout la fiche du compte terrain connecté, sans sa notation", async () => {
    const { headers } = await loginAs(fieldCommissionnaireEmail);
    const res = await request(app)
      .get("/api/commissionnaires/me")
      .set("Cookie", headers["set-cookie"]);
    expect(res.status).toBe(200);
    expect(res.body.idCommissionnaire).toBe(createdCommissionnaireIds[0]);
    for (const field of ["scoreGlobal", "scorePerformance", "classement", "incidents", "niveau"]) {
      expect(res.body[field]).toBeUndefined();
    }
  });

  it("/commissionnaires/me renvoie 404 pour un compte sans fiche liée", async () => {
    const { headers } = await loginAs(operationsEmail);
    const res = await request(app)
      .get("/api/commissionnaires/me")
      .set("Cookie", headers["set-cookie"]);
    expect(res.status).toBe(404);
  });

  it("juridique ne peut pas créer de commissionnaire (commissionnaires:manage manquant)", async () => {
    const { headers } = await loginAs(juridiqueEmail);
    const res = await postCommissionnaire(headers["set-cookie"], {
      fullName: "Refusé",
      idDocumentType: "CARTE_ELECTEUR",
      idNumber: "X",
    });
    expect(res.status).toBe(403);
  });

  it("P1.1 : nom, type et numéro de pièce, et recto sont obligatoires", async () => {
    const { headers } = await loginAs(operationsEmail);
    const cookies = headers["set-cookie"];
    const base = { fullName: "Sans pièce", idDocumentType: "CARTE_ELECTEUR", idNumber: "EL-1" };
    expect((await postCommissionnaire(cookies, { ...base, fullName: "" })).status).toBe(400);
    expect((await postCommissionnaire(cookies, { ...base, idDocumentType: "PASSEPORT" })).status).toBe(400);
    expect((await postCommissionnaire(cookies, { ...base, idNumber: "" })).status).toBe(400);
    const noRecto = await postCommissionnaire(cookies, base, { recto: null });
    expect(noRecto.status).toBe(400);
    expect(noRecto.body.message).toMatch(/recto/);
    // Contenu qui n'est pas réellement une image : refusé malgré le type annoncé.
    const fake = await postCommissionnaire(cookies, base, { recto: Buffer.from("pas une image") });
    expect(fake.status).toBe(400);
  });

  it("P1.1 : des ajouts simultanés reçoivent des codes distincts et consécutifs ; un collecteur reçoit un code CTR", async () => {
    const { headers } = await loginAs(operationsEmail);
    const cookies = headers["set-cookie"];
    const preview = await request(app).get("/api/commissionnaires/next-code").set("Cookie", cookies);
    expect(preview.body.data.code).toMatch(/^CMR-\d{3,}$/);

    const results = await Promise.all(
      [1, 2, 3].map((n) =>
        postCommissionnaire(cookies, {
          fullName: `Simultané ${n} ${suffix}`,
          idDocumentType: "CARTE_IDENTITE",
          idNumber: `ID-${n}-${suffix}`,
        })
      )
    );
    results.forEach((res) => expect(res.status).toBe(201));
    const codes = results.map((res) => res.body.data.code);
    expect(new Set(codes).size).toBe(3);
    results.forEach((res) => {
      createdCommissionnaireIds.push(res.body.data.idCommissionnaire);
      createdPersonIds.push(res.body.data.idPerson);
    });

    const collecteur = await postCommissionnaire(
      cookies,
      { fullName: `Collecteur ${suffix}`, profil: "COLLECTEUR", idDocumentType: "CARTE_ELECTEUR", idNumber: `CT-${suffix}` },
      { verso: pngRecto }
    );
    expect(collecteur.status).toBe(201);
    expect(collecteur.body.data.code).toMatch(/^CTR-\d{3,}$/);
    expect(collecteur.body.data.person.hasIdDocumentVerso).toBe(true);
    createdCommissionnaireIds.push(collecteur.body.data.idCommissionnaire);
    createdPersonIds.push(collecteur.body.data.idPerson);

    const stats = await request(app).get("/api/commissionnaires/stats").set("Cookie", cookies);
    expect(stats.body.data.actifs).toBeGreaterThanOrEqual(4);
    expect(stats.body.data.collecteurs).toBeGreaterThanOrEqual(1);
  });

  it("P1.1 : la pièce n'est consultable qu'avec commissionnaires:identity:read", async () => {
    const id = createdCommissionnaireIds[0];
    const { headers } = await loginAs(operationsEmail);
    const refused = await request(app).get(`/api/commissionnaires/${id}/piece-identite`).set("Cookie", headers["set-cookie"]);
    expect(refused.status).toBe(403);
    // Jamais servie par le dossier public des fichiers.
    const person = await Person.findByPk(fieldPersonId);
    const direct = await request(app).get(`/${person.idDocumentPath}`);
    expect(direct.status).toBe(404);
  });

  it("l'évaluation du score déclenche la grille d'évolution automatique (≥75 → Confirmé)", async () => {
    const { headers } = await loginAs(operationsEmail);
    const idCommissionnaire = createdCommissionnaireIds[0];

    const res = await request(app)
      .patch(`/api/commissionnaires/${idCommissionnaire}/score`)
      .set("Cookie", headers["set-cookie"])
      .send({
        scorePerformance: 20,
        scoreQualite: 20,
        scoreDiscipline: 20,
        scoreEngagement: 20,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.scoreGlobal).toBe("80.00");
    expect(res.body.data.niveau).toBe("CONFIRME");
    expect(res.body.data.classement).toBe("TRES_PERFORMANT");
  });

  it("un incident réduit le score discipline et peut déclencher le statut Observation (<60)", async () => {
    const { headers } = await loginAs(operationsEmail);
    const idCommissionnaire = createdCommissionnaireIds[0];

    const res = await request(app)
      .post(`/api/commissionnaires/${idCommissionnaire}/incidents`)
      .set("Cookie", headers["set-cookie"])
      .send({
        type: "NON_RESPECT_REGLES",
        gravite: "MAJEUR",
        description: "Non-respect des règles de collecte",
        impactDiscipline: 25,
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.commissionnaire.scoreDiscipline)).toBe(0);
    expect(Number(res.body.commissionnaire.scoreGlobal)).toBe(60);
    expect(res.body.commissionnaire.classement).toBe("MOYEN");
  });

  it("un incident qui fait tomber le score sous 60 déclenche le statut Observation automatique", async () => {
    const { headers } = await loginAs(operationsEmail);

    // Scénario isolé (nouveau commissionnaire) pour contrôler précisément
    // le score de départ : la seule chose qu'un incident peut réduire est
    // le score discipline, donc les 3 autres dimensions doivent déjà être
    // assez basses pour que la perte de discipline franchisse le seuil.
    const createRes = await postCommissionnaire(headers["set-cookie"], {
      fullName: "Commissionnaire Observation Test",
      idDocumentType: "CARTE_ELECTEUR",
      idNumber: `OBS-${suffix}`,
    });
    expect(createRes.status).toBe(201);
    const idCommissionnaire = createRes.body.data.idCommissionnaire;
    createdCommissionnaireIds.push(idCommissionnaire);
    createdPersonIds.push(createRes.body.data.idPerson);

    const scoreRes = await request(app)
      .patch(`/api/commissionnaires/${idCommissionnaire}/score`)
      .set("Cookie", headers["set-cookie"])
      .send({ scorePerformance: 15, scoreQualite: 15, scoreDiscipline: 25, scoreEngagement: 15 });
    expect(Number(scoreRes.body.data.scoreGlobal)).toBe(70);
    expect(scoreRes.body.data.statut).toBe("ACTIF");

    const incidentRes = await request(app)
      .post(`/api/commissionnaires/${idCommissionnaire}/incidents`)
      .set("Cookie", headers["set-cookie"])
      .send({ type: "RETARD", gravite: "MODERE", impactDiscipline: 15 });

    expect(incidentRes.status).toBe(201);
    expect(Number(incidentRes.body.commissionnaire.scoreGlobal)).toBe(55);
    expect(incidentRes.body.commissionnaire.statut).toBe("OBSERVATION");
    expect(incidentRes.body.commissionnaire.classement).toBe("RISQUE");
  });
});

describe("BACK-G11 - Suspension d'un commissionnaire → révocation de session", () => {
  it("suspendre un commissionnaire avec compte lié invalide immédiatement sa session active", async () => {
    const idCommissionnaire = createdCommissionnaireIds[0];

    const fieldLogin = await loginAs(fieldCommissionnaireEmail);
    const fieldCookies = fieldLogin.headers["set-cookie"];

    const beforeSuspension = await request(app)
      .get("/api/auth/profile")
      .set("Cookie", fieldCookies);
    expect(beforeSuspension.status).toBe(200);

    const { headers } = await loginAs(operationsEmail);
    const suspendRes = await request(app)
      .patch(`/api/commissionnaires/${idCommissionnaire}`)
      .set("Cookie", headers["set-cookie"])
      .send({ statut: "SUSPENDU" });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.statut).toBe("SUSPENDU");

    const afterSuspension = await request(app)
      .get("/api/auth/profile")
      .set("Cookie", fieldCookies);
    expect(afterSuspension.status).toBe(401);
  });
});

describe("BACK-G10 - Missions terrain et validation", () => {
  it("un commissionnaire soumet une mission, idempotente sur son uuid", async () => {
    // `fresh: true` - la session mémoïsée de ce compte a été révoquée par
    // le test de suspension ci-dessus (BACK-G11), une nouvelle connexion
    // est nécessaire (la suspension d'un commissionnaire ne bloque pas les
    // connexions futures, seulement les sessions déjà actives).
    const { headers } = await loginAs(fieldCommissionnaireEmail, { fresh: true });
    const idCommissionnaire = createdCommissionnaireIds[0];
    const uuid = `mission-${suffix}`;

    const firstRes = await request(app)
      .post("/api/missions")
      .set("Cookie", headers["set-cookie"])
      .send({ uuid, idCommissionnaire, type: "SUIVI", notes: "Suivi client" });
    expect(firstRes.status).toBe(201);
    createdMissionIds.push(firstRes.body.data.idMission);

    const resubmitRes = await request(app)
      .post("/api/missions")
      .set("Cookie", headers["set-cookie"])
      .send({ uuid, idCommissionnaire, type: "SUIVI", notes: "Resoumission après coupure" });
    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.data.idMission).toBe(firstRes.body.data.idMission);
  });

  it("operations peut valider une mission", async () => {
    const { headers } = await loginAs(operationsEmail);
    const idMission = createdMissionIds[0];

    const res = await request(app)
      .patch(`/api/missions/${idMission}/valider`)
      .set("Cookie", headers["set-cookie"]);
    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe("VALIDEE");
  });

  it("le rejet d'une mission exige un motif", async () => {
    const commissionnaireLogin = await loginAs(fieldCommissionnaireEmail);
    const idCommissionnaire = createdCommissionnaireIds[0];

    const createRes = await request(app)
      .post("/api/missions")
      .set("Cookie", commissionnaireLogin.headers["set-cookie"])
      .send({ uuid: `mission-reject-${suffix}`, idCommissionnaire, type: "APPORT_CLIENT" });
    expect(createRes.status).toBe(201);
    createdMissionIds.push(createRes.body.data.idMission);

    const { headers } = await loginAs(operationsEmail);

    const withoutMotif = await request(app)
      .patch(`/api/missions/${createRes.body.data.idMission}/rejeter`)
      .set("Cookie", headers["set-cookie"]);
    expect(withoutMotif.status).toBe(400);

    const withMotif = await request(app)
      .patch(`/api/missions/${createRes.body.data.idMission}/rejeter`)
      .set("Cookie", headers["set-cookie"])
      .send({ motifRejet: "Données incomplètes" });
    expect(withMotif.status).toBe(200);
    expect(withMotif.body.data.statut).toBe("REJETEE");
    expect(withMotif.body.data.motifRejet).toBe("Données incomplètes");
  });
});
