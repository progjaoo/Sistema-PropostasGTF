import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import { createTestApp } from "../test-app";

describe("browser and request security", () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it("allows the configured web origin", async () => {
    const response = await request(app)
      .get("/api/healthz")
      .set("Origin", "http://localhost:21709");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:21709",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not reflect an unknown origin", async () => {
    const response = await request(app)
      .get("/api/healthz")
      .set("Origin", "https://evil.example");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows native mobile requests without an Origin header", async () => {
    const response = await request(app)
      .get("/api/healthz")
      .set("X-Client-Platform", "mobile");

    expect(response.status).toBe(200);
  });

  it("rejects unknown origins on cookie-based auth endpoints", async () => {
    const refresh = await request(app)
      .post("/api/auth/refresh")
      .set("Origin", "https://evil.example");
    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Origin", "https://evil.example");

    expect(refresh.status).toBe(403);
    expect(logout.status).toBe(403);
  });

  it("sets API security and private cache headers", async () => {
    const response = await request(app).get("/api/healthz");

    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers["content-security-policy"]).toContain(
      "default-src 'none'",
    );
  });
});
