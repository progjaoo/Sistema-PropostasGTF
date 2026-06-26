import { Router } from "express";
import {
  db,
  proposalsTable,
  proposalProductsTable,
  proposalVersionsTable,
  stationsTable,
  advertisersTable,
  usersTable,
  proposalTemplatesTable,
} from "@workspace/db";
import { eq, and, or, ilike, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  CreateProposalBody,
  UpdateProposalBody,
  UpdateProposalStatusBody,
} from "@workspace/api-zod";
import { buildFullProposal } from "./proposal-templates";

const router = Router();

async function buildSummary(p: typeof proposalsTable.$inferSelect) {
  const [adv] = p.advertiserId ? await db.select().from(advertisersTable).where(eq(advertisersTable.id, p.advertiserId)) : [null];
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.createdById));
  const [template] = p.fromTemplateId ? await db.select().from(proposalTemplatesTable).where(eq(proposalTemplatesTable.id, p.fromTemplateId)) : [null];
  return {
    id: p.id,
    status: p.status,
    propType: p.propType,
    propMonth: p.propMonth,
    propYear: p.propYear,
    campTag: p.campTag ?? null,
    clientLine1: p.clientLine1 ?? null,
    advertiserName: adv ? adv.tradeName : null,
    fromTemplateName: template ? template.name : null,
    createdByName: user ? user.name : "",
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const { page = "1", limit = "20", status, advertiserId, search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (req.userRole !== "ADMIN") {
    conditions.push(eq(proposalsTable.createdById, req.userId!));
  }
  if (status) conditions.push(eq(proposalsTable.status, status as "DRAFT"));
  if (advertiserId) conditions.push(eq(proposalsTable.advertiserId, advertiserId));
  if (search) {
    conditions.push(
      or(
        ilike(proposalsTable.propType, `%${search}%`),
        ilike(proposalsTable.clientLine1, `%${search}%`),
        ilike(proposalsTable.campTag, `%${search}%`)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = where
    ? await db.select().from(proposalsTable).where(where).orderBy(desc(proposalsTable.updatedAt)).limit(limitNum).offset(offset)
    : await db.select().from(proposalsTable).orderBy(desc(proposalsTable.updatedAt)).limit(limitNum).offset(offset);

  const totalRows = where
    ? await db.select({ count: sql<number>`count(*)::int` }).from(proposalsTable).where(where)
    : await db.select({ count: sql<number>`count(*)::int` }).from(proposalsTable);

  const total = totalRows[0]?.count ?? 0;
  const data = await Promise.all(rows.map(buildSummary));
  res.json({ data, total, page: pageNum, limit: limitNum });
});

router.post("/", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProposalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [station] = parsed.data.stationId
    ? await db.select().from(stationsTable).where(eq(stationsTable.id, parsed.data.stationId))
    : await db.select().from(stationsTable).limit(1);
  if (!station) {
    res.status(400).json({ error: "No station found" });
    return;
  }
  const { products, ...rest } = parsed.data;
  const [proposal] = await db
    .insert(proposalsTable)
    .values({ ...rest, stationId: station.id, createdById: req.userId!, stats: rest.stats ?? [] })
    .returning();

  if (products && products.length > 0) {
    await db.insert(proposalProductsTable).values(
      products.map((p, i) => ({
        proposalId: proposal.id,
        order: p.order ?? i,
        qty: p.qty ?? "01",
        title: p.title,
        description: p.description ?? null,
        detail: p.detail ?? null,
        program: p.program ?? null,
        tags: p.tags ?? [],
        color: (p.color ?? "BLUE") as "BLUE" | "YELLOW" | "RED" | "GREEN" | "DARK",
      }))
    );
  }

  await db.insert(proposalVersionsTable).values({
    proposalId: proposal.id,
    snapshot: proposal,
    createdById: req.userId!,
  });

  res.status(201).json(await buildFullProposal(proposal.id));
});

router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const full = await buildFullProposal(req.params["id"]!);
  if (!full) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  if (req.userRole !== "ADMIN" && full.createdById !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(full);
});

router.patch("/:id", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProposalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, req.params["id"]!));
  if (!existing) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  if (req.userRole !== "ADMIN" && existing.createdById !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { products, ...rest } = parsed.data;
  const [proposal] = await db
    .update(proposalsTable)
    .set(rest)
    .where(eq(proposalsTable.id, req.params["id"]!))
    .returning();

  if (products !== undefined) {
    await db.delete(proposalProductsTable).where(eq(proposalProductsTable.proposalId, proposal.id));
    if (products.length > 0) {
      await db.insert(proposalProductsTable).values(
        products.map((p, i) => ({
          proposalId: proposal.id,
          order: p.order ?? i,
          qty: p.qty ?? "01",
          title: p.title,
          description: p.description ?? null,
          detail: p.detail ?? null,
          program: p.program ?? null,
          tags: p.tags ?? [],
          color: (p.color ?? "BLUE") as "BLUE" | "YELLOW" | "RED" | "GREEN" | "DARK",
        }))
      );
    }
  }

  const versionCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(proposalVersionsTable)
    .where(eq(proposalVersionsTable.proposalId, proposal.id));
  if ((versionCount[0]?.count ?? 0) >= 50) {
    const oldest = await db
      .select()
      .from(proposalVersionsTable)
      .where(eq(proposalVersionsTable.proposalId, proposal.id))
      .orderBy(proposalVersionsTable.createdAt)
      .limit(1);
    if (oldest[0]) {
      await db.delete(proposalVersionsTable).where(eq(proposalVersionsTable.id, oldest[0].id));
    }
  }
  await db.insert(proposalVersionsTable).values({
    proposalId: proposal.id,
    snapshot: proposal,
    createdById: req.userId!,
  });

  res.json(await buildFullProposal(proposal.id));
});

router.delete("/:id", requireAuth, async (req, res): Promise<void> => {
  const [existing] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, req.params["id"]!));
  if (!existing) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  if (req.userRole !== "ADMIN" && existing.createdById !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.update(proposalsTable).set({ status: "ARCHIVED" }).where(eq(proposalsTable.id, req.params["id"]!));
  res.json({ message: "Proposal archived" });
});

router.patch("/:id/status", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProposalStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [proposal] = await db
    .update(proposalsTable)
    .set({ status: parsed.data.status as "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "ARCHIVED" })
    .where(eq(proposalsTable.id, req.params["id"]!))
    .returning();
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  res.json(await buildFullProposal(proposal.id));
});

router.post("/:id/duplicate", requireAuth, async (req, res): Promise<void> => {
  const [existing] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, req.params["id"]!));
  if (!existing) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  const products = await db.select().from(proposalProductsTable).where(eq(proposalProductsTable.proposalId, existing.id));
  const { id, createdAt, updatedAt, ...rest } = existing;
  const [newProposal] = await db.insert(proposalsTable).values({ ...rest, createdById: req.userId!, status: "DRAFT" }).returning();
  if (products.length > 0) {
    await db.insert(proposalProductsTable).values(
      products.map((p) => ({ ...p, id: undefined as unknown as string, proposalId: newProposal.id }))
    );
  }
  res.status(201).json(await buildFullProposal(newProposal.id));
});

router.get("/:id/versions", requireAuth, async (req, res): Promise<void> => {
  const versions = await db
    .select()
    .from(proposalVersionsTable)
    .where(eq(proposalVersionsTable.proposalId, req.params["id"]!))
    .orderBy(desc(proposalVersionsTable.createdAt));
  res.json(versions.map((v) => ({
    id: v.id,
    proposalId: v.proposalId,
    snapshot: v.snapshot,
    createdAt: v.createdAt.toISOString(),
    createdById: v.createdById ?? null,
  })));
});

router.get("/:id/versions/:versionId", requireAuth, async (req, res): Promise<void> => {
  const [v] = await db.select().from(proposalVersionsTable).where(eq(proposalVersionsTable.id, req.params["versionId"]!));
  if (!v) {
    res.status(404).json({ error: "Version not found" });
    return;
  }
  res.json({
    id: v.id,
    proposalId: v.proposalId,
    snapshot: v.snapshot,
    createdAt: v.createdAt.toISOString(),
    createdById: v.createdById ?? null,
  });
});

export default router;
