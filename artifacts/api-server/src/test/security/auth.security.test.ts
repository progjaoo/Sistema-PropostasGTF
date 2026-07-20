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

function cookieValue(setCookie: string[] | string | undefined): string {
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!header) throw new Error("Expected a refresh cookie");
  return header.split(";")[0]!;
}

describe("secure authentication sessions", () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("keeps the web refresh token out of JSON and uses a strict cookie", async () => {
    const user = await createCommercial();
    const response = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: testPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.refreshToken).toBeUndefined();
    const cookie = String(response.headers["set-cookie"]);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
  });

  it("revokes the session family when a rotated token is replayed", async () => {
    const user = await createCommercial();
    const login = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: testPassword,
    });
    const originalCookie = cookieValue(login.headers["set-cookie"]);

    const rotated = await request(app)
      .post("/api/auth/refresh")
      .set("Origin", "http://localhost:21709")
      .set("Cookie", originalCookie);
    expect(rotated.status).toBe(200);
    const rotatedCookie = cookieValue(rotated.headers["set-cookie"]);

    const replay = await request(app)
      .post("/api/auth/refresh")
      .set("Origin", "http://localhost:21709")
      .set("Cookie", originalCookie);
    expect(replay.status).toBe(401);

    const familyRevoked = await request(app)
      .post("/api/auth/refresh")
      .set("Origin", "http://localhost:21709")
      .set("Cookie", rotatedCookie);
    expect(familyRevoked.status).toBe(401);
  });

  it("applies inactive status and role changes immediately", async () => {
    const user = await createCommercial();
    const login = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: testPassword,
    });
    const authorization = `Bearer ${login.body.accessToken}`;

    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });
    const usersAsPromotedAdmin = await request(app)
      .get("/api/users")
      .set("Authorization", authorization);
    expect(usersAsPromotedAdmin.status).toBe(200);

    await prisma.user.update({
      where: { id: user.id },
      data: { active: false },
    });
    const inactive = await request(app)
      .get("/api/auth/me")
      .set("Authorization", authorization);
    expect(inactive.status).toBe(401);
  });

  it("returns an opaque refresh token only from mobile login", async () => {
    const user = await createCommercial();
    const response = await request(app).post("/api/auth/mobile/login").send({
      email: user.email,
      password: testPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.refreshToken.split(".")).toHaveLength(1);
  });
});
