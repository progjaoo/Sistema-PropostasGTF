import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import {
  createCommercial,
  createStation,
  grantStationAccess,
  resetTestDatabase,
  testPassword,
} from "../factories";
import { createTestApp } from "../test-app";

describe("request validation and safe errors", () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("rejects unknown login properties with a structured error", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "user@example.test",
      password: testPassword,
      role: "ADMIN",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: expect.any(String),
      message: expect.any(String),
      requestId: expect.any(String),
    });
  });

  it("rejects unsupported content types and malformed JSON safely", async () => {
    const unsupported = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "text/plain")
      .send("not-json");
    expect(unsupported.status).toBe(415);
    expect(unsupported.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");

    const malformed = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe("INVALID_JSON");
  });

  it("rejects invalid pagination and mass-assignment fields", async () => {
    const user = await createCommercial();
    const station = await createStation();
    await grantStationAccess({ userId: user.id, stationId: station.id });
    const login = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: testPassword,
    });
    const authorization = `Bearer ${login.body.accessToken}`;

    const invalidQuery = await request(app)
      .get("/api/proposals?page=invalid&limit=500")
      .set("Authorization", authorization);
    expect(invalidQuery.status).toBe(400);

    const massAssignment = await request(app)
      .post("/api/proposals")
      .set("Authorization", authorization)
      .send({
        stationId: station.id,
        createdById: "attacker-controlled",
      });
    expect(massAssignment.status).toBe(400);
  });

  it("limits proposals to one hundred products", async () => {
    const user = await createCommercial();
    const station = await createStation();
    await grantStationAccess({ userId: user.id, stationId: station.id });
    const login = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: testPassword,
    });

    const response = await request(app)
      .post("/api/proposals")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({
        stationId: station.id,
        products: Array.from({ length: 101 }, (_, index) => ({
          title: `Product ${index + 1}`,
        })),
      });

    expect(response.status).toBe(400);
  });

  it("rejects unsupported image MIME types and oversized decoded images", async () => {
    const user = await createCommercial();
    const login = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: testPassword,
    });
    const authorization = `Bearer ${login.body.accessToken}`;

    const unsupported = await request(app)
      .patch("/api/profile")
      .set("Authorization", authorization)
      .send({ avatarBase64: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" });
    const oversized = await request(app)
      .patch("/api/profile")
      .set("Authorization", authorization)
      .send({
        avatarBase64: `data:image/png;base64,${"A".repeat(2_796_204)}`,
      });

    expect(unsupported.status).toBe(400);
    expect(oversized.status).toBe(400);
  });
});
