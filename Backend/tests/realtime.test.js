import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { io as ioClient } from "socket.io-client";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User } from "../models/index.model.js";
import { initSocketGateway, emitToUser, emitToRole } from "../shared/socketGateway.js";

const suffix = Date.now();
const testPassword = "TestPass@123";
const createdUserIds = [];

let operationsEmail;
let operationsUserId;
let operationsToken;
let httpServer;
let port;

beforeAll(async () => {
  const hashed = await bcrypt.hash(testPassword, await bcrypt.genSalt());

  operationsEmail = `operations.realtime.${suffix}@nbn.test`;
  const operations = await User.create({
    fullName: "Operations Realtime Test",
    email: operationsEmail,
    password: hashed,
    role: "operations",
    status: "ACTIVE",
  });
  operationsUserId = operations.idUser;
  createdUserIds.push(operations.idUser);

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: operationsEmail, password: testPassword });
  expect(login.status).toBe(200);
  operationsToken = login.body.data.token;

  // BACK-G18 — Socket.IO a besoin d'un vrai serveur HTTP en écoute
  // (contrairement à supertest, qui simule les requêtes REST sans jamais
  // ouvrir de port) : instance dédiée, port éphémère, jamais le port réel
  // de développement.
  httpServer = createServer(app);
  initSocketGateway(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  port = httpServer.address().port;
});

afterAll(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
  if (createdUserIds.length) {
    await User.destroy({ where: { idUser: createdUserIds } });
  }
});

const connect = (token) =>
  new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
  });

// Le Frontend web n'a pas accès à `auth.token` (cookie httpOnly,
// ADMIN-G01) — la gateway doit aussi accepter le jeton via le cookie
// `token`, exactement comme `authMiddlware` pour le REST.
const connectViaCookie = (token) =>
  new Promise((resolve, reject) => {
    // La poignée de main initiale (polling HTTP) transporte fiablement des
    // en-têtes personnalisés côté Node — le websocket pur n'est pas garanti
    // ici selon les couches sous-jacentes, seule la première requête HTTP
    // du handshake Engine.IO compte pour l'authentification côté serveur.
    const socket = ioClient(`http://localhost:${port}`, {
      extraHeaders: { Cookie: `token=${token}` },
      reconnection: false,
      forceNew: true,
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
  });

describe("BACK-G18 - Realtime (Socket.IO) avec audiences calculées côté serveur", () => {
  it("refuse une connexion sans token", async () => {
    await expect(connect(undefined)).rejects.toThrow();
  });

  it("refuse une connexion avec un token invalide", async () => {
    await expect(connect("un.jeton.invalide")).rejects.toThrow();
  });

  it("accepte une connexion authentifiée par cookie (Frontend web, cookie httpOnly)", async () => {
    const socket = await connectViaCookie(operationsToken);
    try {
      expect(socket.connected).toBe(true);
    } finally {
      socket.disconnect();
    }
  });

  it("accepte une connexion avec un token valide et rejoint sa room personnelle calculée côté serveur", async () => {
    const socket = await connect(operationsToken);
    try {
      const received = new Promise((resolve) => socket.once("notification:new", resolve));

      // `emitToUser` calcule lui-même le nom de room ("user:<id>") — le
      // client n'a jamais fourni ni demandé ce nom, il ne fait qu'écouter
      // l'événement une fois dans la bonne room par construction serveur.
      emitToUser(operationsUserId, "notification:new", { idNotification: 999, type: "test" });

      const payload = await received;
      expect(payload.idNotification).toBe(999);
    } finally {
      socket.disconnect();
    }
  });

  it("ne reçoit rien pour un autre utilisateur ni un autre rôle (audience isolée)", async () => {
    const socket = await connect(operationsToken);
    try {
      let receivedForOtherUser = false;
      socket.on("notification:new", () => {
        receivedForOtherUser = true;
      });
      let receivedForOtherRole = false;
      socket.on("alert:new", () => {
        receivedForOtherRole = true;
      });

      emitToUser(operationsUserId + 999999, "notification:new", { idNotification: 1 });
      emitToRole("juridique", "alert:new", { idAlert: 1 });

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(receivedForOtherUser).toBe(false);
      expect(receivedForOtherRole).toBe(false);
    } finally {
      socket.disconnect();
    }
  });

  it("reçoit une diffusion de rôle (audience de service)", async () => {
    const socket = await connect(operationsToken);
    try {
      const received = new Promise((resolve) => socket.once("alert:new", resolve));

      emitToRole("operations", "alert:new", { idAlert: 42, type: "test:role" });

      const payload = await received;
      expect(payload.idAlert).toBe(42);
    } finally {
      socket.disconnect();
    }
  });

  it("le REST reste intégralement fonctionnel sans aucune connexion Socket.IO active (fallback, CLAUDE.md §6)", async () => {
    // Aucun socket connecté ici — juste la garantie que le flux métier
    // (déjà exercé de bout en bout par tests/notification.test.js) ne
    // dépend jamais d'un client Socket.IO connecté pour fonctionner.
    const res = await request(app)
      .get("/api/notifications/me")
      .set("Authorization", `Bearer ${operationsToken}`);
    expect(res.status).toBe(200);
  });
});
