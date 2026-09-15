import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { User, RentalRequest, TimelineEvent } from "../models/index.model.js";

const suffix = Date.now();
const users = {};
const cookies = {};
let rentalRequest;
const reason = "Doublon d'une demande déjà traitée par téléphone.";

beforeAll(async () => {
  const hashed = await bcrypt.hash("TestPass@123", await bcrypt.genSalt());
  for (const role of ["admin", "operations", "tresorerie"]) {
    users[role] = await User.create({
      fullName: `${role} deletion ${suffix}`,
      email: `${role}.deletion.${suffix}@nbn.test`,
      password: hashed,
      role,
      status: "ACTIVE",
    });
    const res = await request(app).post("/api/auth/login").send({ email: users[role].email, password: "TestPass@123" });
    cookies[role] = res.headers["set-cookie"];
  }

  rentalRequest = await RentalRequest.create({
    fullName: `Demande Supprimee ${suffix}`,
    phone: `+24396${String(suffix).slice(-7)}`,
    commune: "KADUTU",
    quartier: "Nyamugo",
    conditionsAcceptedAt: new Date(),
  });
});

afterAll(async () => {
  await TimelineEvent.destroy({ where: { actorUserId: Object.values(users).map((user) => user.idUser) } });
  await RentalRequest.destroy({ where: { idRentalRequest: rentalRequest.idRentalRequest }, force: true });
  await User.destroy({ where: { idUser: Object.values(users).map((user) => user.idUser) } });
});

describe("Supprimer la fiche d'une demande", () => {
  it("exige un commentaire (400)", async () => {
    const res = await request(app)
      .delete(`/api/rental-requests/${rentalRequest.idRentalRequest}`)
      .set("Cookie", cookies.operations)
      .send({ reason: "doublon" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/commentaire/);
  });

  it("refuse un rôle sans clients:manage (403)", async () => {
    const res = await request(app)
      .delete(`/api/rental-requests/${rentalRequest.idRentalRequest}`)
      .set("Cookie", cookies.tresorerie)
      .send({ reason });

    expect(res.status).toBe(403);
  });

  it("masque la fiche des écrans en gardant auteur, date et motif", async () => {
    const res = await request(app)
      .delete(`/api/rental-requests/${rentalRequest.idRentalRequest}`)
      .set("Cookie", cookies.operations)
      .send({ reason });
    expect(res.status).toBe(200);

    const list = await request(app).get("/api/rental-requests").set("Cookie", cookies.operations);
    expect(list.body.data.some((item) => item.idRentalRequest === rentalRequest.idRentalRequest)).toBe(false);

    const detail = await request(app)
      .get(`/api/rental-requests/${rentalRequest.idRentalRequest}`)
      .set("Cookie", cookies.operations);
    expect(detail.status).toBe(404);

    const stored = await RentalRequest.findByPk(rentalRequest.idRentalRequest, { paranoid: false });
    expect(stored.deletedAt).not.toBeNull();
    expect(stored.deletedBy).toBe(users.operations.idUser);
    expect(stored.deletionReason).toBe(reason);
  });

  it("le rapport des demandes reprend la fiche supprimée avec son motif", async () => {
    const res = await request(app)
      .get("/api/reports/rental-requests?format=csv&deleted=only")
      .set("Cookie", cookies.admin);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    const line = res.text.split("\n").find((row) => row.includes(rentalRequest.fullName));
    expect(line).toContain("Supprimée");
    expect(line).toContain(reason);
    expect(line).toContain(users.operations.fullName);
  });
});
