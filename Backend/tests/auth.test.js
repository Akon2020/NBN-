import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User } from "../models/index.model.js";

const suffix = Date.now();
const agentEmail = `agent.test.${suffix}@nbn.test`;
const adminEmail = `admin.test.${suffix}@nbn.test`;
const testPassword = "TestPass@123";

const createdUserIds = [];

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());
  const admin = await User.create({
    fullName: "Admin Test",
    email: adminEmail,
    password: hashed,
    role: "admin",
    status: "ACTIVE",
  });
  createdUserIds.push(admin.idUser);
});

afterAll(async () => {
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("SEC-G01 - authentification par cookie seul", () => {
  it("permet d'accéder à une route protégée avec le cookie seul (sans header Authorization)", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      fullName: "Agent Test",
      email: agentEmail,
      password: testPassword,
      role: "admin", // tentative d'auto-élévation, doit être ignorée (voir test SEC-G02 ci-dessous)
    });

    expect(registerRes.status).toBe(201);
    createdUserIds.push(registerRes.body.data.user.idUser);

    const cookies = registerRes.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const profileRes = await request(app)
      .get("/api/auth/profile")
      .set("Cookie", cookies);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.user.email).toBe(agentEmail);
  });

  it("refuse l'accès sans aucun jeton", async () => {
    const res = await request(app).get("/api/auth/profile");
    expect(res.status).toBe(401);
  });
});

describe("SEC-G02 - garde de rôle sur /api/users", () => {
  it("l'auto-inscription publique ne permet jamais de s'attribuer le rôle admin", async () => {
    const user = await User.findOne({ where: { email: agentEmail } });
    expect(user.role).toBe("agent");
  });

  it("refuse à un agent la création d'un utilisateur (403)", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: agentEmail, password: testPassword });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers["set-cookie"];

    const addRes = await request(app)
      .post("/api/users/add")
      .set("Cookie", cookies)
      .send({ fullName: "Ne devrait pas être créé", email: `refuse.${suffix}@nbn.test` });

    expect(addRes.status).toBe(403);
  });

  it("autorise un admin à créer un utilisateur (201)", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: adminEmail, password: testPassword });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers["set-cookie"];

    const newUserEmail = `created.${suffix}@nbn.test`;
    const addRes = await request(app)
      .post("/api/users/add")
      .set("Cookie", cookies)
      .send({ fullName: "Créé par admin", email: newUserEmail, role: "agent" });

    expect(addRes.status).toBe(201);
    createdUserIds.push(addRes.body.data.idUser);
  });
});

describe("SEC-G03 - compte désactivé", () => {
  it("refuse l'accès à un utilisateur INACTIVE même avec un jeton encore valide", async () => {
    const inactiveEmail = `inactive.${suffix}@nbn.test`;
    const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());
    const inactiveUser = await User.create({
      fullName: "Inactive Test",
      email: inactiveEmail,
      password: hashed,
      role: "agent",
      status: "ACTIVE",
    });
    createdUserIds.push(inactiveUser.idUser);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: inactiveEmail, password: testPassword });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers["set-cookie"];

    await User.update(
      { status: "INACTIVE" },
      { where: { idUser: inactiveUser.idUser } }
    );

    const profileRes = await request(app)
      .get("/api/auth/profile")
      .set("Cookie", cookies);

    expect(profileRes.status).toBe(401);
  });
});
