import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import {
  createAdmin,
  createAdvertiser,
  createCommercial,
  createProposal,
  createStation,
  grantStationAccess,
  resetTestDatabase,
  testPassword,
} from "../factories";
import { createTestApp } from "../test-app";

async function bearer(app: Express, email: string): Promise<string> {
  const login = await request(app).post("/api/auth/login").send({
    email,
    password: testPassword,
  });
  expect(login.status).toBe(200);
  return `Bearer ${login.body.accessToken}`;
}

describe("authorization matrix", () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("allows a commercial user to manage an owned proposal in an allowed station", async () => {
    const user = await createCommercial();
    const station = await createStation();
    await grantStationAccess({ userId: user.id, stationId: station.id });
    const proposal = await createProposal({ createdById: user.id, stationId: station.id });
    const authorization = await bearer(app, user.email);

    const detail = await request(app)
      .get(`/api/proposals/${proposal.id}`)
      .set("Authorization", authorization);
    const update = await request(app)
      .patch(`/api/proposals/${proposal.id}`)
      .set("Authorization", authorization)
      .send({ campTag: "Atualizada" });
    const timeline = await request(app)
      .post(`/api/proposals/${proposal.id}/timeline`)
      .set("Authorization", authorization)
      .send({ step: "IN_CONVERSATION" });
    const status = await request(app)
      .patch(`/api/proposals/${proposal.id}/status`)
      .set("Authorization", authorization)
      .send({ status: "SENT" });

    expect(detail.status).toBe(200);
    expect(update.status).toBe(200);
    expect(timeline.status).toBe(201);
    expect(status.status).toBe(200);
  });

  it("blocks proposal detail, mutation, deletion and versions for another commercial user", async () => {
    const owner = await createCommercial();
    const outsider = await createCommercial();
    const station = await createStation();
    await grantStationAccess({ userId: owner.id, stationId: station.id });
    await grantStationAccess({ userId: outsider.id, stationId: station.id });
    const proposal = await createProposal({ createdById: owner.id, stationId: station.id });
    const authorization = await bearer(app, outsider.email);

    const responses = await Promise.all([
      request(app).get(`/api/proposals/${proposal.id}`).set("Authorization", authorization),
      request(app).patch(`/api/proposals/${proposal.id}`).set("Authorization", authorization).send({ campTag: "Ataque" }),
      request(app).delete(`/api/proposals/${proposal.id}`).set("Authorization", authorization),
      request(app).get(`/api/proposals/${proposal.id}/versions`).set("Authorization", authorization),
    ]);

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403]);
  });

  it("blocks station catalog and proposal creation without the required capability", async () => {
    const user = await createCommercial();
    const station = await createStation();
    await grantStationAccess({
      userId: user.id,
      stationId: station.id,
      canCreateProposals: false,
      canViewCatalog: false,
    });
    const authorization = await bearer(app, user.email);
    const proposal = await createProposal({ createdById: user.id, stationId: station.id });

    const products = await request(app)
      .get(`/api/product-templates?stationId=${station.id}`)
      .set("Authorization", authorization);
    const programs = await request(app)
      .get(`/api/proposal-categories?stationId=${station.id}`)
      .set("Authorization", authorization);
    const create = await request(app)
      .post("/api/proposals")
      .set("Authorization", authorization)
      .send({ stationId: station.id });
    const update = await request(app)
      .patch(`/api/proposals/${proposal.id}`)
      .set("Authorization", authorization)
      .send({ campTag: "Sem permissao" });
    const duplicate = await request(app)
      .post(`/api/proposals/${proposal.id}/duplicate`)
      .set("Authorization", authorization);
    const status = await request(app)
      .patch(`/api/proposals/${proposal.id}/status`)
      .set("Authorization", authorization)
      .send({ status: "SENT" });

    expect(products.status).toBe(403);
    expect(programs.status).toBe(403);
    expect(create.status).toBe(403);
    expect(update.status).toBe(403);
    expect(duplicate.status).toBe(403);
    expect(status.status).toBe(403);
  });

  it("blocks administrative mutations for commercial users and allows an admin", async () => {
    const commercial = await createCommercial();
    const admin = await createAdmin();
    const commercialAuthorization = await bearer(app, commercial.email);
    const adminAuthorization = await bearer(app, admin.email);

    const forbidden = await Promise.all([
      request(app).post("/api/users").set("Authorization", commercialAuthorization).send({
        name: "Novo Usuario",
        email: "novo@example.test",
        password: testPassword,
      }),
      request(app).post("/api/stations").set("Authorization", commercialAuthorization).send({
        name: "Empresa Nova",
        primaryColor: "#427EFF",
      }),
      request(app).post("/api/proposal-types").set("Authorization", commercialAuthorization).send({
        name: "Tipo Novo",
      }),
    ]);
    const allowed = await request(app)
      .post("/api/proposal-types")
      .set("Authorization", adminAuthorization)
      .send({ name: "Tipo Administrativo" });
    const stationAllowed = await request(app)
      .post("/api/stations")
      .set("Authorization", adminAuthorization)
      .send({ name: "Empresa Administrativa", primaryColor: "#427EFF" });

    expect(forbidden.map((response) => response.status)).toEqual([403, 403, 403]);
    expect(allowed.status).toBe(201);
    expect(stationAllowed.status).toBe(201);
  });

  it("redacts another seller's linked proposal while preserving ownership metadata", async () => {
    const owner = await createCommercial({ name: "Vendedor Responsavel" });
    const viewer = await createCommercial();
    const station = await createStation();
    await grantStationAccess({ userId: owner.id, stationId: station.id });
    await grantStationAccess({ userId: viewer.id, stationId: station.id });
    const advertiser = await createAdvertiser();
    await createProposal({
      createdById: owner.id,
      stationId: station.id,
      advertiserId: advertiser.id,
      overrides: {
        propType: "Pacote Confidencial",
        investValue: "R$ 9.999,00",
      },
    });
    const authorization = await bearer(app, viewer.email);

    const response = await request(app)
      .get(`/api/advertisers/${advertiser.id}`)
      .set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.proposals).toHaveLength(1);
    expect(response.body.proposals[0]).toMatchObject({
      viewerCanEdit: false,
      propType: null,
      investValue: null,
      createdByName: "Vendedor Responsavel",
    });
  });
});
