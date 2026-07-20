import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import { prisma } from "@workspace/db";
import {
  createCommercial,
  resetTestDatabase,
  testPassword,
} from "../factories";
import { createTestApp } from "../test-app";

describe("durable authentication rate limits", () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("blocks the sixth invalid login while allowing a valid login", async () => {
    const user = await createCommercial();
    const invalidBody = { email: user.email, password: "wrong-password" };

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "198.51.100.10")
        .send(invalidBody);
      expect(response.status).toBe(401);
    }

    const valid = await request(app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", "198.51.100.10")
      .send({ email: user.email, password: testPassword });
    expect(valid.status).toBe(200);

    const blocked = await request(await createTestApp())
      .post("/api/auth/login")
      .set("X-Forwarded-For", "198.51.100.10")
      .send(invalidBody);
    expect(blocked.status).toBe(429);
  });

  it("limits public commercial registration to three requests per hour", async () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await request(app)
        .post("/api/auth/register-commercial")
        .set("X-Forwarded-For", "198.51.100.20")
        .send({
          name: `Commercial ${attempt}`,
          email: `commercial-${attempt}@example.test`,
          password: testPassword,
        });
      expect(response.status).toBe(201);
    }

    const blocked = await request(await createTestApp())
      .post("/api/auth/register-commercial")
      .set("X-Forwarded-For", "198.51.100.20")
      .send({
        name: "Commercial 4",
        email: "commercial-4@example.test",
        password: testPassword,
      });
    expect(blocked.status).toBe(429);
  });

  it("cleans expired counters only with the protected cron secret", async () => {
    process.env["CRON_SECRET"] = "test-cron-secret-that-is-long-enough";
    await prisma.securityRateLimit.create({
      data: {
        scope: "expired-test",
        keyHash: "expired-key",
        windowStart: new Date(Date.now() - 120_000),
        count: 1,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const denied = await request(app).get("/api/internal/security/cleanup");
    const allowed = await request(app)
      .get("/api/internal/security/cleanup")
      .set("Authorization", `Bearer ${process.env["CRON_SECRET"]}`);

    expect(denied.status).toBe(401);
    expect(allowed.status).toBe(200);
    expect(allowed.body.deleted).toBe(1);
  });
});
