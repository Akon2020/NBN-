import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, AccessGrant } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];
const createdGrantIds = [];

let adminEmail;
let consultantEmail;
let consultantId;

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  adminEmail = `admin.ag.${suffix}@nbn.test`;
  const admin = await User.create({
    fullName: "Admin AccessGrant Test",
    email: adminEmail,
    password: hashed,
    role: "admin",
    status: "ACTIVE",
  });
  createdUserIds.push(admin.idUser);

  consultantEmail = `consultant.ag.${suffix}@nbn.test`;
  const consultant = await User.create({
    fullName: "Consultant AccessGrant Test",
    email: consultantEmail,
    password: hashed,
    role: "consultant",
    status: "ACTIVE",
  });
  consultantId = consultant.idUser;
  createdUserIds.push(consultant.idUser);
});

afterAll(async () => {
  if (createdGrantIds.length) {
    await AccessGrant.destroy({ where: { idAccessGrant: createdGrantIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

const loginAs = async (email) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: testPassword });
  expect(res.status).toBe(200);
  return res.headers["set-cookie"];
};

describe("ADMIN-G02 - API AccessGrant", () => {
  it("un admin peut créer un AccessGrant avec reason obligatoire", async () => {
    const cookies = await loginAs(adminEmail);

    const missingReason = await request(app)
      .post("/api/access-grants")
      .set("Cookie", cookies)
      .send({ idUser: consultantId, permissionKey: "users:read" });
    expect(missingReason.status).toBe(400);

    const res = await request(app)
      .post("/api/access-grants")
      .set("Cookie", cookies)
      .send({
        idUser: consultantId,
        permissionKey: "users:read",
        reason: "Test QA - accès temporaire",
      });
    expect(res.status).toBe(201);
    createdGrantIds.push(res.body.data.idAccessGrant);
  });

  it("un admin peut révoquer un AccessGrant", async () => {
    const cookies = await loginAs(adminEmail);
    const createRes = await request(app)
      .post("/api/access-grants")
      .set("Cookie", cookies)
      .send({
        idUser: consultantId,
        permissionKey: "users:read",
        reason: "Test QA - à révoquer",
      });
    const grantId = createRes.body.data.idAccessGrant;
    createdGrantIds.push(grantId);

    const revokeRes = await request(app)
      .patch(`/api/access-grants/${grantId}/revoke`)
      .set("Cookie", cookies);
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.revokedAt).toBeTruthy();
  });

  it("un utilisateur sans roles:manage ne peut pas créer d'AccessGrant", async () => {
    const cookies = await loginAs(consultantEmail);
    const res = await request(app)
      .post("/api/access-grants")
      .set("Cookie", cookies)
      .send({
        idUser: consultantId,
        permissionKey: "users:read",
        reason: "Auto-attribution refusée",
      });
    expect(res.status).toBe(403);
  });
});
