import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { resolveTrustProxy } from "../config/trustProxy.js";

describe("resolveTrustProxy", () => {
  it("fait confiance à un proxy en production quand rien n'est configuré", () => {
    expect(resolveTrustProxy(undefined, "production")).toBe(1);
    expect(resolveTrustProxy("", "production")).toBe(1);
  });

  it("ne fait confiance à aucun proxy en développement par défaut", () => {
    expect(resolveTrustProxy(undefined, "development")).toBe(false);
  });

  it("interprète les valeurs explicites", () => {
    expect(resolveTrustProxy("2", "production")).toBe(2);
    expect(resolveTrustProxy("false", "production")).toBe(false);
    expect(resolveTrustProxy("true", "development")).toBe(true);
    expect(resolveTrustProxy("loopback, 10.0.0.0/8", "production")).toBe(
      "loopback, 10.0.0.0/8"
    );
  });

  // Le vrai symptôme : derrière le proxy, chaque appareil doit garder sa
  // propre adresse, sinon ils partagent tous le même quota de connexion.
  it("distingue deux appareils derrière le même proxy", async () => {
    const app = express();
    app.set("trust proxy", resolveTrustProxy(undefined, "production"));
    app.get("/ip", (req, res) => res.json({ ip: req.ip }));

    const first = await request(app).get("/ip").set("X-Forwarded-For", "41.243.10.1");
    const second = await request(app).get("/ip").set("X-Forwarded-For", "41.243.10.2");

    expect(first.body.ip).toBe("41.243.10.1");
    expect(second.body.ip).toBe("41.243.10.2");
  });
});
