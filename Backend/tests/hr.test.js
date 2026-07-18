import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import {
  User,
  Person,
  EmployeeProfile,
  Service,
  Evaluation,
  Objective,
  Skill,
  EmployeeSkill,
  Training,
  EmployeeTraining,
} from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdPersonIds = [];
const createdEmployeeProfileIds = [];
const createdSkillIds = [];
const createdTrainingIds = [];

let operationsEmail;
let juridiqueEmail;
let serviceId;

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

  operationsEmail = `operations.hr.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations HR Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  juridiqueEmail = `juridique.hr.${suffix}@nbn.test`;
  const juridique = await User.create({
    fullName: "Juridique HR Test",
    email: juridiqueEmail,
    password: hashed,
    role: "juridique",
    status: "ACTIVE",
  });
  createdUserIds.push(juridique.idUser);

  const service = await Service.findOne({ where: { name: "Juridique" } });
  serviceId = service.idService;
});

afterAll(async () => {
  if (createdEmployeeProfileIds.length) {
    await EmployeeTraining.destroy({ where: { idEmployeeProfile: createdEmployeeProfileIds } });
    await EmployeeSkill.destroy({ where: { idEmployeeProfile: createdEmployeeProfileIds } });
    await Objective.destroy({ where: { idEmployeeProfile: createdEmployeeProfileIds } });
    await Evaluation.destroy({ where: { idEmployeeProfile: createdEmployeeProfileIds } });
    await EmployeeProfile.destroy({ where: { idEmployeeProfile: createdEmployeeProfileIds } });
  }
  if (createdTrainingIds.length) {
    await Training.destroy({ where: { idTraining: createdTrainingIds } });
  }
  if (createdSkillIds.length) {
    await Skill.destroy({ where: { idSkill: createdSkillIds } });
  }
  if (createdPersonIds.length) {
    await Person.destroy({ where: { idPerson: createdPersonIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G22 - RH avancé", () => {
  it("crée un profil RH à partir d'une nouvelle Person", async () => {
    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .post("/api/hr/employee-profiles")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({
        fullName: `Employé RH Test ${suffix}`,
        phone: "+243900000090",
        idService: serviceId,
        contractType: "CDI",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.person).toBeDefined();
    createdEmployeeProfileIds.push(res.body.data.idEmployeeProfile);
    createdPersonIds.push(res.body.data.idPerson);
  });

  it("un rôle sans hr:manage ne peut pas créer de profil RH (403)", async () => {
    const login = await loginAs(juridiqueEmail);
    const res = await request(app)
      .post("/api/hr/employee-profiles")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ fullName: "Sans permission", idService: serviceId });
    expect(res.status).toBe(403);
  });

  it("crée une évaluation puis un objectif pour un profil RH, et fait avancer le statut de l'objectif", async () => {
    const login = await loginAs(operationsEmail);

    const profileRes = await request(app)
      .post("/api/hr/employee-profiles")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ fullName: `Employé Eval ${suffix}`, idService: serviceId });
    const idEmployeeProfile = profileRes.body.data.idEmployeeProfile;
    createdEmployeeProfileIds.push(idEmployeeProfile);
    createdPersonIds.push(profileRes.body.data.idPerson);

    const evalRes = await request(app)
      .post(`/api/hr/employee-profiles/${idEmployeeProfile}/evaluations`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ period: "2026-Q2", score: 82, comments: "Bonne progression" });
    expect(evalRes.status).toBe(201);

    const evalList = await request(app)
      .get(`/api/hr/employee-profiles/${idEmployeeProfile}/evaluations`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(evalList.body.data.length).toBe(1);

    const objRes = await request(app)
      .post(`/api/hr/employee-profiles/${idEmployeeProfile}/objectives`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: "Finaliser le rapport trimestriel", dueDate: "2026-09-30" });
    expect(objRes.status).toBe(201);
    expect(objRes.body.data.statut).toBe("EN_COURS");

    const advance = await request(app)
      .patch(`/api/hr/objectives/${objRes.body.data.idObjective}/statut`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statut: "ATTEINT" });
    expect(advance.status).toBe(200);
    expect(advance.body.data.statut).toBe("ATTEINT");
  });

  it("associe une compétence à un profil RH puis la retire", async () => {
    const login = await loginAs(operationsEmail);

    const profileRes = await request(app)
      .post("/api/hr/employee-profiles")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ fullName: `Employé Skill ${suffix}`, idService: serviceId });
    const idEmployeeProfile = profileRes.body.data.idEmployeeProfile;
    createdEmployeeProfileIds.push(idEmployeeProfile);
    createdPersonIds.push(profileRes.body.data.idPerson);

    const skillRes = await request(app)
      .post("/api/hr/skills")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ name: `Négociation ${suffix}`, category: "Commercial" });
    expect(skillRes.status).toBe(201);
    createdSkillIds.push(skillRes.body.data.idSkill);

    const linkRes = await request(app)
      .post(`/api/hr/employee-profiles/${idEmployeeProfile}/skills`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ idSkill: skillRes.body.data.idSkill, niveau: "AVANCE" });
    expect(linkRes.status).toBe(201);
    expect(linkRes.body.data.niveau).toBe("AVANCE");

    const removeRes = await request(app)
      .delete(`/api/hr/employee-skills/${linkRes.body.data.idEmployeeSkill}`)
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(removeRes.status).toBe(200);
  });

  it("assigne une formation à un profil RH puis fait avancer son statut", async () => {
    const login = await loginAs(operationsEmail);

    const profileRes = await request(app)
      .post("/api/hr/employee-profiles")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ fullName: `Employé Formation ${suffix}`, idService: serviceId });
    const idEmployeeProfile = profileRes.body.data.idEmployeeProfile;
    createdEmployeeProfileIds.push(idEmployeeProfile);
    createdPersonIds.push(profileRes.body.data.idPerson);

    const trainingRes = await request(app)
      .post("/api/hr/trainings")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ title: `Excel avancé ${suffix}`, provider: "Interne" });
    expect(trainingRes.status).toBe(201);
    createdTrainingIds.push(trainingRes.body.data.idTraining);

    const assignRes = await request(app)
      .post(`/api/hr/employee-profiles/${idEmployeeProfile}/trainings`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ idTraining: trainingRes.body.data.idTraining });
    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.statut).toBe("PLANIFIEE");

    const advance = await request(app)
      .patch(`/api/hr/employee-trainings/${assignRes.body.data.idEmployeeTraining}/statut`)
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .send({ statut: "TERMINEE" });
    expect(advance.status).toBe(200);
    expect(advance.body.data.statut).toBe("TERMINEE");
  });
});
