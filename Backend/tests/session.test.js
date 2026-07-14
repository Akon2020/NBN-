import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User } from "../models/index.model.js";

const suffix = Date.now();
const adminEmail = `admin.session.${suffix}@nbn.test`;
const userEmail = `user.session.${suffix}@nbn.test`;
const testPassword = "TestPass@123";

const createdUserIds = [];

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());
  const admin = await User.create({
    fullName: "Admin Session Test",
    email: adminEmail,
    password: hashed,
    role: "admin",
    status: "ACTIVE",
  });
  createdUserIds.push(admin.idUser);

  const user = await User.create({
    fullName: "User Session Test",
    email: userEmail,
    password: hashed,
    role: "agent",
    status: "ACTIVE",
  });
  createdUserIds.push(user.idUser);
});

afterAll(async () => {
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

describe("BACK-G01 - rotation du refresh token et détection de réutilisation", () => {
  it("rotate le refresh token à chaque appel à /refresh", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: userEmail, password: testPassword });
    expect(loginRes.status).toBe(200);
    const firstRefreshToken = loginRes.body.data.refreshToken;
    expect(firstRefreshToken).toBeTruthy();

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: firstRefreshToken });

    expect(refreshRes.status).toBe(200);
    const secondRefreshToken = refreshRes.body.data.refreshToken;
    expect(secondRefreshToken).toBeTruthy();
    expect(secondRefreshToken).not.toBe(firstRefreshToken);
  });

  it("révoque toute la famille de tokens si un refresh token déjà utilisé est représenté", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: userEmail, password: testPassword });
    const firstRefreshToken = loginRes.body.data.refreshToken;

    const firstRotation = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: firstRefreshToken });
    expect(firstRotation.status).toBe(200);
    const secondRefreshToken = firstRotation.body.data.refreshToken;

    // Réutilisation du premier refresh token (déjà révoqué par la rotation
    // ci-dessus) : doit déclencher la révocation de toute la famille.
    const reuseAttempt = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: firstRefreshToken });
    expect(reuseAttempt.status).toBe(401);

    // Le second refresh token, pourtant valide et non encore utilisé,
    // doit lui aussi avoir été révoqué (même famille).
    const secondRefreshAttempt = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: secondRefreshToken });
    expect(secondRefreshAttempt.status).toBe(401);
  });
});

describe("BACK-G01 - suspension de compte", () => {
  it("invalide l'accès en moins de 60 secondes même avec un access token encore valide", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: userEmail, password: testPassword });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers["set-cookie"];

    // Le token fonctionne avant suspension.
    const beforeSuspension = await request(app)
      .get("/api/auth/profile")
      .set("Cookie", cookies);
    expect(beforeSuspension.status).toBe(200);

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: adminEmail, password: testPassword });
    const adminCookies = adminLogin.headers["set-cookie"];

    const targetUser = await User.findOne({ where: { email: userEmail } });
    const suspendRes = await request(app)
      .patch(`/api/users/update/${targetUser.idUser}`)
      .set("Cookie", adminCookies)
      .send({ status: "INACTIVE" });
    expect(suspendRes.status).toBe(200);

    // Le cache de securityVersion est invalidé immédiatement par la
    // suspension (pas besoin d'attendre le TTL de ~60s dans ce test).
    const afterSuspension = await request(app)
      .get("/api/auth/profile")
      .set("Cookie", cookies);
    expect(afterSuspension.status).toBe(401);
  });
});
