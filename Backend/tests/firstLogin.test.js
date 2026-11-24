import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { AuthToken, Session, User } from "../models/index.model.js";
import { DEFAULT_PASSWD } from "../config/env.js";

// Première connexion d'un compte créé ou réinitialisé par l'administration :
// pas de session tant que l'utilisateur n'a pas choisi son mot de passe.
const suffix = Date.now();
const adminEmail = `admin.first.${suffix}@nbn.test`;
const adminPassword = "Admin@First1";
const newEmail = `nouveau.${suffix}@nbn.test`;
let adminCookies;

beforeAll(async () => {
  await User.create({
    fullName: "Admin Première Connexion",
    email: adminEmail,
    password: await bcrypt.hash(adminPassword, 4),
    role: "admin",
    status: "ACTIVE",
  });
  const login = await request(app).post("/api/auth/login").send({ email: adminEmail, password: adminPassword });
  adminCookies = login.headers["set-cookie"];
});

afterAll(async () => {
  const users = await User.findAll({ where: { email: [adminEmail, newEmail] } });
  const ids = users.map((u) => u.idUser);
  await AuthToken.destroy({ where: { idUser: ids } });
  await Session.destroy({ where: { idUser: ids } });
  await User.destroy({ where: { idUser: ids } });
});

describe("Première connexion d'un compte créé par l'admin", () => {
  it("redirige vers le choix du mot de passe, même si l'e-mail est tapé autrement", async () => {
    const created = await request(app)
      .post("/api/users/add")
      .set("Cookie", adminCookies)
      .field("fullName", "Nouvel Agent")
      .field("email", `  ${newEmail.toUpperCase()} `)
      .field("role", "operations");
    expect(created.status).toBe(201);

    const user = await User.findOne({ where: { email: newEmail } });
    expect(user.mustChangePassword).toBe(true);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: newEmail.toUpperCase(), password: DEFAULT_PASSWD || "Changemoi@NBN2026" });
    expect(login.status).toBe(403);
    expect(login.body.requiresPasswordChange).toBe(true);
    expect(login.headers["set-cookie"]).toBeUndefined();

    const setup = await request(app)
      .post("/api/auth/reset-password/confirm")
      .send({ token: login.body.setupToken, newPassword: "Mien@Choix5" });
    expect(setup.status).toBe(200);
    expect(setup.body.signedIn).toBe(true);
    await user.reload();
    expect(user.mustChangePassword).toBe(false);

    const again = await request(app).post("/api/auth/login").send({ email: newEmail, password: "Mien@Choix5" });
    expect(again.status).toBe(200);
  });

  it("un mot de passe réinitialisé par l'admin doit être changé, sans pouvoir le reprendre", async () => {
    const user = await User.findOne({ where: { email: newEmail } });
    const reset = await request(app)
      .patch(`/api/users/update/${user.idUser}/reset-password`)
      .set("Cookie", adminCookies)
      .send({ newPassword: "Donne@Admin6" });
    expect(reset.status).toBe(200);

    const login = await request(app).post("/api/auth/login").send({ email: newEmail, password: "Donne@Admin6" });
    expect(login.status).toBe(403);
    expect(login.body.requiresPasswordChange).toBe(true);

    // Reprendre le mot de passe donné : refusé, et le lien reste valable.
    const same = await request(app)
      .post("/api/auth/reset-password/confirm")
      .send({ token: login.body.setupToken, newPassword: "Donne@Admin6" });
    expect(same.status).toBe(400);

    const setup = await request(app)
      .post("/api/auth/reset-password/confirm")
      .send({ token: login.body.setupToken, newPassword: "Encore@Mien7" });
    expect(setup.status).toBe(200);
    expect(setup.body.signedIn).toBe(true);
  });

  it("un utilisateur sans users:manage ne peut pas réinitialiser un mot de passe (403)", async () => {
    const user = await User.findOne({ where: { email: newEmail } });
    const login = await request(app).post("/api/auth/login").send({ email: newEmail, password: "Encore@Mien7" });
    const res = await request(app)
      .patch(`/api/users/update/${user.idUser}/reset-password`)
      .set("Cookie", login.headers["set-cookie"])
      .send({ newPassword: "Pirate@Mot8" });
    expect(res.status).toBe(403);
  });
});
