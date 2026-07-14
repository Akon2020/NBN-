import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("Health check", () => {
  it("GET / répond 200", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toContain("Checking NBN API");
  });
});
