import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { AuthToken, OutboxEvent, User } from "../models/index.model.js";
import { issueAuthToken } from "../utils/authTokens.js";
import { DEFAULT_PASSWD } from "../config/env.js";

const suffix = Date.now();
const email = `reset.${suffix}@nbn.test`;
const defaultEmail = `default.${suffix}@nbn.test`;
const oldPassword = "Ancien@Mot1";
const newPassword = "Nouveau@Mot2";
const userIds = [];

const queuedFor = async (to) => {
  const events = await OutboxEvent.findAll({ where: { eventType: "email:send" }, order: [["createdAt", "DESC"]], limit: 50 });
  return events.map((e) => JSON.parse(e.payload)).filter((p) => p.to === to);
};

beforeAll(async () => {
  const user = await User.create({
    fullName: "Reset Test",
    email,
    password: await bcrypt.hash(oldPassword, 4),
    role: "operations",
    status: "ACTIVE",
  });
  const withDefault = await User.create({
    fullName: "Défaut Test",
    email: defaultEmail,
    password: await bcrypt.hash(DEFAULT_PASSWD || "Changemoi@NBN2026", 4),
    role: "operations",
    status: "ACTIVE",
  });
  userIds.push(user.idUser, withDefault.idUser);
});

afterAll(async () => {
  await AuthToken.destroy({ where: { idUser: userIds } });
  await User.destroy({ where: { idUser: userIds } });
});

describe("P0.2 - Mot de passe oublié", () => {
  it("répond pareil pour une adresse inconnue et ne renvoie jamais le lien", async () => {
    const unknown = await request(app).post("/api/auth/forgot-password").send({ email: `absent.${suffix}@nbn.test` });
    const known = await request(app).post("/api/auth/forgot-password").send({ email: email.toUpperCase() });
    expect(unknown.status).toBe(200);
    expect(known.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    expect(JSON.stringify(known.body)).not.toMatch(/token|reset-password\?/);
    const mails = await queuedFor(email);
    expect(mails.length).toBeGreaterThan(0);
    expect(mails[0].html).toMatch(/\/auth\/reset-password\?token=[a-f0-9]{64}/);
  });

  it("un nouveau lien remplace le précédent, le lien sert une seule fois", async () => {
    const [user] = await User.findAll({ where: { email } });
    const first = await issueAuthToken({ idUser: user.idUser, purpose: "PASSWORD_RESET" });
    const second = await issueAuthToken({ idUser: user.idUser, purpose: "PASSWORD_RESET" });

    const replaced = await request(app).post("/api/auth/reset-password/confirm").send({ token: first.token, newPassword });
    expect(replaced.status).toBe(400);
    expect(replaced.body.reason).toBe("revoked");

    const weak = await request(app).post("/api/auth/reset-password/confirm").send({ token: second.token, newPassword: "abc" });
    expect(weak.status).toBe(400);

    const ok = await request(app).post("/api/auth/reset-password/confirm").send({ token: second.token, newPassword });
    expect(ok.status).toBe(200);
    expect(ok.body.signedIn).toBe(false);
    expect(ok.headers["set-cookie"]).toBeUndefined();

    const again = await request(app).post("/api/auth/reset-password/confirm").send({ token: second.token, newPassword });
    expect(again.status).toBe(400);
    expect(again.body.reason).toBe("used");

    const login = await request(app).post("/api/auth/login").send({ email, password: newPassword });
    expect(login.status).toBe(200);
  });

  it("un lien expiré est refusé", async () => {
    const [user] = await User.findAll({ where: { email } });
    const { token } = await issueAuthToken({ idUser: user.idUser, purpose: "PASSWORD_RESET" });
    await AuthToken.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { idUser: user.idUser, usedAt: null, revokedAt: null } });
    const check = await request(app).post("/api/auth/token/check").send({ token });
    expect(check.status).toBe(400);
    expect(check.body.reason).toBe("expired");
  });

  it("un jeton de session ne sert pas de lien de réinitialisation", async () => {
    const login = await request(app).post("/api/auth/login").send({ email, password: newPassword });
    const res = await request(app)
      .post("/api/auth/reset-password/confirm")
      .send({ token: login.body.data.token, newPassword: "Autre@Mot3" });
    expect(res.status).toBe(400);
  });
});

describe("P0.2 - Mot de passe par défaut", () => {
  it("donne un jeton court pour choisir son mot de passe, puis ouvre la session", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: defaultEmail, password: DEFAULT_PASSWD || "Changemoi@NBN2026" });
    expect(login.status).toBe(403);
    expect(login.body.requiresPasswordChange).toBe(true);
    expect(login.headers["set-cookie"]).toBeUndefined();

    const check = await request(app).post("/api/auth/token/check").send({ token: login.body.setupToken });
    expect(check.status).toBe(200);
    expect(check.body).toMatchObject({ purpose: "PASSWORD_SETUP", email: defaultEmail });

    const setup = await request(app)
      .post("/api/auth/reset-password/confirm")
      .send({ token: login.body.setupToken, newPassword: "Choisi@Mot4" });
    expect(setup.status).toBe(200);
    expect(setup.body.signedIn).toBe(true);
    const cookies = setup.headers["set-cookie"];
    expect(cookies.join(";")).toMatch(/SameSite=Lax/i);
    const profile = await request(app).get("/api/auth/profile").set("Cookie", cookies);
    expect(profile.status).toBe(200);
  });
});

describe("P0.1 - Origine refusée", () => {
  it("répond 403 explicite à une page ouverte en http://", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://site-inconnu.example")
      .send({ email, password: newPassword });
    // En développement les origines LAN/localhost passent, pas les autres.
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CORS_ORIGIN_REFUSED");
  });
});
