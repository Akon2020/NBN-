import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];

let operationsEmail;
let commissionnaireEmail;
let technologiqueEmail;

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

  operationsEmail = `operations.dashboard.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Dashboard Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(operations.idUser);

  commissionnaireEmail = `commissionnaire.dashboard.${suffix}@nbn.test`;
  const commissionnaire = await User.create({
    fullName: "Commissionnaire Dashboard Test",
    email: commissionnaireEmail,
    password: hashed,
    role: "commissionnaire",
    status: "ACTIVE",
  });
  createdUserIds.push(commissionnaire.idUser);

  technologiqueEmail = `technologique.dashboard.${suffix}@nbn.test`;
  const technologique = await User.create({
    fullName: "Technologique Dashboard Test",
    email: technologiqueEmail,
    password: hashed,
    role: "technologique",
    status: "ACTIVE",
  });
  createdUserIds.push(technologique.idUser);
});

afterAll(async () => {
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("ADMIN-G00 - Statistiques réelles du tableau de bord", () => {
  it("un rôle avec un large accès (operations) voit la plupart des blocs, jamais activeUsers", async () => {
    const login = await loginAs(operationsEmail);
    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.properties).toBeDefined();
    expect(typeof res.body.data.properties.rentals).toBe("number");
    expect(typeof res.body.data.properties.sales).toBe("number");
    expect(typeof res.body.data.favorites).toBe("number");
    expect(typeof res.body.data.clients).toBe("number");
    expect(typeof res.body.data.pendingMissions).toBe("number");
    expect(typeof res.body.data.pendingRequisitions).toBe("number");
    expect(typeof res.body.data.openCaisses).toBe("number");
    expect(typeof res.body.data.pendingCommissions).toBe("number");
    expect(res.body.data.activeUsers).toBeUndefined();
    expect(Array.isArray(res.body.data.recentActivity)).toBe(true);
  });

  it("un rôle à accès restreint (commissionnaire) ne voit que les biens/favoris/missions", async () => {
    const login = await loginAs(commissionnaireEmail);
    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.properties).toBeDefined();
    expect(typeof res.body.data.pendingMissions).toBe("number");
    expect(res.body.data.clients).toBeUndefined();
    expect(res.body.data.pendingRequisitions).toBeUndefined();
    expect(res.body.data.openCaisses).toBeUndefined();
    expect(res.body.data.pendingCommissions).toBeUndefined();
    expect(res.body.data.activeUsers).toBeUndefined();
  });

  it("technologique (users:read) voit activeUsers", async () => {
    const login = await loginAs(technologiqueEmail);
    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.activeUsers).toBe("number");
    expect(res.body.data.activeUsers).toBeGreaterThan(0);
  });

  it("sans authentification, l'accès est refusé (401)", async () => {
    const res = await request(app).get("/api/dashboard/stats");
    expect(res.status).toBe(401);
  });
});
