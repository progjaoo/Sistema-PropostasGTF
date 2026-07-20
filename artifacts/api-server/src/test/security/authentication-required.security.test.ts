import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import { createTestApp } from "../test-app";

describe("private API authentication", () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it("returns 401 without a bearer token", async () => {
    const response = await request(app).get("/api/proposals");
    const mutation = await request(app)
      .post("/api/proposals")
      .send({ stationId: "station-test" });
    expect(response.status).toBe(401);
    expect(mutation.status).toBe(401);
  });
});
