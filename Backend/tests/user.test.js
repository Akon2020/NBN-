import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, Session } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];

let adminEmail;
let targetEmail;
let targetUserId;
let otherEmail;

const login = async (email) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: testPassword });
  expect(res.status).toBe(200);
  return { cookies: res.headers["set-cookie"], token: res.body.data.token };
};

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  adminEmail = `admin.usertest.${suffix}@nbn.test`;
  const admin = await User.create({
    fullName: "Admin User Test",
    email: adminEmail,
    password: hashed,
    role: "admin",
    status: "ACTIVE",
  });
  createdUserIds.push(admin.idUser);

  targetEmail = `target.usertest.${suffix}@nbn.test`;
  const target = await User.create({
    fullName: "Target User Test",
    email: targetEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  targetUserId = target.idUser;
  createdUserIds.push(target.idUser);

  otherEmail = `other.usertest.${suffix}@nbn.test`;
  const other = await User.create({
    fullName: "Other User Test",
    email: otherEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  createdUserIds.push(other.idUser);
});

afterAll(async () => {
  if (createdUserIds.length) {
    await Session.destroy({ where: { idUser: createdUserIds } });
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("GOAL 16 - Changement de mot de passe (libre-service, propriétaire uniquement)", () => {
  it("un utilisateur ne peut pas changer le mot de passe d'un tiers (403)", async () => {
    const { token } = await login(otherEmail);

    const res = await request(app)
      .patch(`/api/users/update/${targetUserId}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        oldPassword: testPassword,
        newPassword: "NouveauPass@123",
        confirmNewPassword: "NouveauPass@123",
      });

    expect(res.status).toBe(403);
  });

  it("un utilisateur peut changer son propre mot de passe, ce qui révoque ses sessions actives", async () => {
    const { token } = await login(targetEmail);

    const session = await Session.create({
      idUser: targetUserId,
      refreshTokenHash: "hash-de-test",
      tokenFamilyId: "famille-de-test",
      platform: "web",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .patch(`/api/users/update/${targetUserId}/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        oldPassword: testPassword,
        newPassword: "NouveauPass@123",
        confirmNewPassword: "NouveauPass@123",
      });

    expect(res.status).toBe(200);

    await session.reload();
    expect(session.revokedAt).not.toBeNull();
    expect(session.revokedReason).toBe("password_changed");

    const updatedUser = await User.findByPk(targetUserId);
    expect(updatedUser.securityVersion).toBeGreaterThan(0);

    // Restaure le mot de passe d'origine pour ne pas perturber d'autres tests.
    const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());
    await updatedUser.update({ password: hashed });
  });
});

describe("GOAL 16 - Réinitialisation admin et gestion des sessions d'un tiers", () => {
  it("un rôle sans users:manage ne peut pas réinitialiser le mot de passe d'un tiers (403)", async () => {
    const { token } = await login(otherEmail);

    const res = await request(app)
      .patch(`/api/users/update/${targetUserId}/reset-password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ newPassword: "AutrePass@123" });

    expect(res.status).toBe(403);
  });

  it("un admin peut réinitialiser le mot de passe d'un tiers sans connaître l'ancien, et révoque ses sessions", async () => {
    const { token } = await login(adminEmail);

    const session = await Session.create({
      idUser: targetUserId,
      refreshTokenHash: "hash-de-test-2",
      tokenFamilyId: "famille-de-test-2",
      platform: "web",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .patch(`/api/users/update/${targetUserId}/reset-password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ newPassword: "ResetParAdmin@123" });

    expect(res.status).toBe(200);

    await session.reload();
    expect(session.revokedAt).not.toBeNull();
    expect(session.revokedReason).toBe("admin_revoke");

    const targetUser = await User.findByPk(targetUserId);
    const passwordCorrect = await bcrypt.compare("ResetParAdmin@123", targetUser.password);
    expect(passwordCorrect).toBe(true);
  });

  it("un admin peut lister les sessions actives d'un utilisateur (sans jamais exposer le hash)", async () => {
    const { token } = await login(adminEmail);

    await Session.create({
      idUser: targetUserId,
      refreshTokenHash: "hash-de-test-3",
      tokenFamilyId: "famille-de-test-3",
      platform: "web",
      deviceLabel: "Chrome sur Windows",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .get(`/api/users/${targetUserId}/sessions`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).not.toHaveProperty("refreshTokenHash");
  });

  it("un admin peut révoquer toutes les sessions actives d'un utilisateur", async () => {
    const { token } = await login(adminEmail);

    await Session.create({
      idUser: targetUserId,
      refreshTokenHash: "hash-de-test-4",
      tokenFamilyId: "famille-de-test-4",
      platform: "web",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .patch(`/api/users/${targetUserId}/sessions/revoke-all`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    const remaining = await Session.findAll({
      where: { idUser: targetUserId, revokedAt: null },
    });
    expect(remaining).toHaveLength(0);
  });
});
