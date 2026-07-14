import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, AccessGrant } from "../models/index.model.js";

const suffix = Date.now();
const testPassword = "TestPass@123";

const users = {};
const createdUserIds = [];
const createdGrantIds = [];

const createUserWithRole = async (role, label) => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());
  const email = `${label}.${suffix}@nbn.test`;
  const user = await User.create({
    fullName: `${label} RBAC Test`,
    email,
    password: hashed,
    role,
    status: "ACTIVE",
  });
  createdUserIds.push(user.idUser);
  return { user, email };
};

const login = async (email) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: testPassword });
  expect(res.status).toBe(200);
  return res.headers["set-cookie"];
};

beforeAll(async () => {
  users.technologique = await createUserWithRole("technologique", "techno");
  users.operations = await createUserWithRole("operations", "operations");
  users.tresorerie = await createUserWithRole("tresorerie", "tresorerie");
  users.consultant = await createUserWithRole("consultant", "consultant");
});

afterAll(async () => {
  if (createdGrantIds.length) {
    await AccessGrant.destroy({ where: { idAccessGrant: createdGrantIds } });
  }
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G02 - matrice RBAC (users:manage)", () => {
  it("technologique peut créer un utilisateur", async () => {
    const cookies = await login(users.technologique.email);
    const res = await request(app)
      .post("/api/users/add")
      .set("Cookie", cookies)
      .send({
        fullName: "Créé par technologique",
        email: `created.by.techno.${suffix}@nbn.test`,
      });
    expect(res.status).toBe(201);
    createdUserIds.push(res.body.data.idUser);
  });

  it("operations ne peut pas créer un utilisateur", async () => {
    const cookies = await login(users.operations.email);
    const res = await request(app)
      .post("/api/users/add")
      .set("Cookie", cookies)
      .send({
        fullName: "Ne devrait pas être créé",
        email: `refuse.ops.${suffix}@nbn.test`,
      });
    expect(res.status).toBe(403);
  });

  it("operations ne peut même pas lister les utilisateurs (users:read)", async () => {
    const cookies = await login(users.operations.email);
    const res = await request(app).get("/api/users").set("Cookie", cookies);
    expect(res.status).toBe(403);
  });
});

describe("BACK-G03 - field-level authorization (property:margin:read)", () => {
  it("tresorerie a la permission property:margin:read", async () => {
    const cookies = await login(users.tresorerie.email);
    // On vérifie la permission effective plutôt que l'API properties
    // (pas encore montée — BACK-G07 en M2) : test direct de la couche RBAC.
    const { hasPermission } = await import("../utils/rbac.js");
    const allowed = await hasPermission(
      users.tresorerie.user,
      "property:margin:read"
    );
    expect(allowed).toBe(true);
  });

  it("operations n'a pas la permission property:margin:read", async () => {
    const { hasPermission } = await import("../utils/rbac.js");
    const allowed = await hasPermission(
      users.operations.user,
      "property:margin:read"
    );
    expect(allowed).toBe(false);
  });
});

describe("BACK-G02 - consultant : zéro permission de base, tout passe par AccessGrant", () => {
  it("un consultant fraîchement créé n'a accès à rien", async () => {
    const cookies = await login(users.consultant.email);
    const res = await request(app).get("/api/users").set("Cookie", cookies);
    expect(res.status).toBe(403);
  });

  it("un AccessGrant actif débloque exactement la permission accordée", async () => {
    const admin = await User.findOne({ where: { role: "admin" } });
    const grant = await AccessGrant.create({
      idUser: users.consultant.user.idUser,
      permissionKey: "users:read",
      grantedBy: admin.idUser,
      reason: "Test QA-G02 - accès temporaire consultant",
    });
    createdGrantIds.push(grant.idAccessGrant);

    const cookies = await login(users.consultant.email);
    const readRes = await request(app).get("/api/users").set("Cookie", cookies);
    expect(readRes.status).toBe(200);

    // La permission accordée ne s'étend pas à d'autres actions.
    const manageRes = await request(app)
      .post("/api/users/add")
      .set("Cookie", cookies)
      .send({ fullName: "X", email: `x.${suffix}@nbn.test` });
    expect(manageRes.status).toBe(403);
  });

  it("un AccessGrant révoqué ne donne plus accès", async () => {
    // Consultant dédié : évite toute contamination par le grant actif créé
    // dans le test précédent, qui reste valide jusqu'au cleanup final.
    const { user: revokedGrantUser, email } = await createUserWithRole(
      "consultant",
      "consultant-revoked"
    );
    const admin = await User.findOne({ where: { role: "admin" } });
    const grant = await AccessGrant.create({
      idUser: revokedGrantUser.idUser,
      permissionKey: "users:read",
      grantedBy: admin.idUser,
      reason: "Test QA-G02 - révocation",
      revokedAt: new Date(),
      revokedBy: admin.idUser,
    });
    createdGrantIds.push(grant.idAccessGrant);

    const cookies = await login(email);
    const res = await request(app).get("/api/users").set("Cookie", cookies);
    expect(res.status).toBe(403);
  });

  it("un AccessGrant expiré ne donne plus accès", async () => {
    const { user: expiredGrantUser, email } = await createUserWithRole(
      "consultant",
      "consultant-expired"
    );
    const admin = await User.findOne({ where: { role: "admin" } });
    const grant = await AccessGrant.create({
      idUser: expiredGrantUser.idUser,
      permissionKey: "users:read",
      grantedBy: admin.idUser,
      reason: "Test QA-G02 - expiration",
      expiresAt: new Date(Date.now() - 1000),
    });
    createdGrantIds.push(grant.idAccessGrant);

    const cookies = await login(email);
    const res = await request(app).get("/api/users").set("Cookie", cookies);
    expect(res.status).toBe(403);
  });
});
