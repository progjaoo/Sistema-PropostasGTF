import { Router } from "express";
import {
  db,
  proposalTemplatesTable,
  proposalTemplateProductsTable,
  proposalCategoriesTable,
  stationsTable,
  proposalsTable,
  proposalProductsTable,
  proposalVersionsTable,
  usersTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  CreateProposalTemplateBody,
  UpdateProposalTemplateBody,
} from "@workspace/api-zod";

const router = Router();

async function formatTemplate(t: typeof proposalTemplatesTable.$inferSelect, includeProducts = false) {
  const [cat] = await db.select().from(proposalCategoriesTable).where(eq(proposalCategoriesTable.id, t.categoryId));
  const usageRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(proposalsTable)
    .where(eq(proposalsTable.fromTemplateId, t.id));
  const usageCount = usageRows[0]?.count ?? 0;

  const base: Record<string, unknown> = {
    id: t.id,
    stationId: t.stationId,
    categoryId: t.categoryId,
    category: cat ? {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? null,
      icon: cat.icon ?? null,
      active: cat.active,
      order: cat.order,
      createdAt: cat.createdAt.toISOString(),
      templateCount: 0,
    } : null,
    name: t.name,
    description: t.description ?? null,
    active: t.active,
    propType: t.propType,
    campTag: t.campTag ?? null,
    periodDesc: t.periodDesc ?? null,
    investDesc: t.investDesc ?? null,
    stats: t.stats ?? [],
    overlayOpacity: t.overlayOpacity,
    usageCount,
    createdAt: t.createdAt.toISOString(),
  };

  if (includeProducts) {
    const products = await db
      .select()
      .from(proposalTemplateProductsTable)
      .where(eq(proposalTemplateProductsTable.templateId, t.id))
      .orderBy(proposalTemplateProductsTable.order);
    base["products"] = products.map((p) => ({
      id: p.id,
      order: p.order,
      qty: p.qty,
      title: p.title,
      description: p.description ?? null,
      detail: p.detail ?? null,
      program: p.program ?? null,
      tags: p.tags ?? [],
      color: p.color,
    }));
  }

  return base;
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const { categoryId } = req.query as { categoryId?: string };
  let rows;
  if (categoryId) {
    rows = await db.select().from(proposalTemplatesTable).where(eq(proposalTemplatesTable.categoryId, categoryId));
  } else {
    rows = await db.select().from(proposalTemplatesTable);
  }
  const result = await Promise.all(rows.map((t) => formatTemplate(t, true)));
  res.json(result);
});

router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const [t] = await db.select().from(proposalTemplatesTable).where(eq(proposalTemplatesTable.id, req.params["id"]!));
  if (!t) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(await formatTemplate(t, true));
});

router.post("/", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProposalTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [station] = await db.select().from(stationsTable).limit(1);
  if (!station) {
    res.status(400).json({ error: "No station configured" });
    return;
  }
  const { products, ...rest } = parsed.data;
  const [t] = await db
    .insert(proposalTemplatesTable)
    .values({ ...rest, stationId: station.id, stats: rest.stats ?? [] })
    .returning();
  if (products && products.length > 0) {
    await db.insert(proposalTemplateProductsTable).values(
      products.map((p, i) => ({
        templateId: t.id,
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
  res.status(201).json(await formatTemplate(t, true));
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateProposalTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { products, ...rest } = parsed.data;
  const [t] = await db
    .update(proposalTemplatesTable)
    .set(rest)
    .where(eq(proposalTemplatesTable.id, req.params["id"]!))
    .returning();
  if (!t) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  if (products !== undefined) {
    await db.delete(proposalTemplateProductsTable).where(eq(proposalTemplateProductsTable.templateId, t.id));
    if (products.length > 0) {
      await db.insert(proposalTemplateProductsTable).values(
        products.map((p, i) => ({
          templateId: t.id,
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
  res.json(await formatTemplate(t, true));
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  await db.delete(proposalTemplatesTable).where(eq(proposalTemplatesTable.id, req.params["id"]!));
  res.json({ message: "Template deleted" });
});

router.post("/:id/use", requireAuth, async (req, res): Promise<void> => {
  const [t] = await db.select().from(proposalTemplatesTable).where(eq(proposalTemplatesTable.id, req.params["id"]!));
  if (!t) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  const products = await db
    .select()
    .from(proposalTemplateProductsTable)
    .where(eq(proposalTemplateProductsTable.templateId, t.id))
    .orderBy(proposalTemplateProductsTable.order);

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear());

  const [proposal] = await db
    .insert(proposalsTable)
    .values({
      stationId: t.stationId,
      createdById: req.userId!,
      fromTemplateId: t.id,
      propType: t.propType,
      propMonth: month,
      propYear: year,
      campTag: t.campTag ?? null,
      periodDesc: t.periodDesc ?? null,
      investDesc: t.investDesc ?? null,
      stats: t.stats ?? [],
      overlayOpacity: t.overlayOpacity,
    })
    .returning();

  if (products.length > 0) {
    await db.insert(proposalProductsTable).values(
      products.map((p) => ({
        proposalId: proposal.id,
        order: p.order,
        qty: p.qty,
        title: p.title,
        description: p.description,
        detail: p.detail,
        program: p.program,
        tags: p.tags,
        color: p.color,
      }))
    );
  }

  await db.insert(proposalVersionsTable).values({
    proposalId: proposal.id,
    snapshot: proposal,
    createdById: req.userId!,
  });

  const fullProposal = await buildFullProposal(proposal.id);
  res.status(201).json(fullProposal);
});

async function buildFullProposal(id: string) {
  const [p] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, id));
  if (!p) return null;
  const [station] = p.stationId ? await db.select().from(stationsTable).where(eq(stationsTable.id, p.stationId)) : [null];
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.createdById));
  const [template] = p.fromTemplateId ? await db.select().from(proposalTemplatesTable).where(eq(proposalTemplatesTable.id, p.fromTemplateId)) : [null];
  const products = await db.select().from(proposalProductsTable).where(eq(proposalProductsTable.proposalId, id)).orderBy(proposalProductsTable.order);
  return {
    id: p.id,
    stationId: p.stationId,
    station: station ? { id: station.id, name: station.name, slogan: station.slogan ?? null, logoBase64: station.logoBase64 ?? null, createdAt: station.createdAt.toISOString() } : null,
    advertiserId: p.advertiserId ?? null,
    advertiser: null,
    createdById: p.createdById,
    createdBy: user ? { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, createdAt: user.createdAt.toISOString() } : null,
    status: p.status,
    fromTemplateId: p.fromTemplateId ?? null,
    fromTemplateName: template ? template.name : null,
    propType: p.propType,
    propMonth: p.propMonth,
    propYear: p.propYear,
    campTag: p.campTag ?? null,
    clientLine1: p.clientLine1 ?? null,
    clientLine2: p.clientLine2 ?? null,
    dateStart: p.dateStart ?? null,
    dateEnd: p.dateEnd ?? null,
    periodDesc: p.periodDesc ?? null,
    bannerBase64: p.bannerBase64 ?? null,
    overlayOpacity: p.overlayOpacity,
    stats: p.stats ?? [],
    investDesc: p.investDesc ?? null,
    investValue: p.investValue ?? null,
    contactName: p.contactName ?? null,
    contactRole: p.contactRole ?? null,
    contactPhone: p.contactPhone ?? null,
    products: products.map((pr) => ({
      id: pr.id,
      order: pr.order,
      qty: pr.qty,
      title: pr.title,
      description: pr.description ?? null,
      detail: pr.detail ?? null,
      program: pr.program ?? null,
      tags: pr.tags ?? [],
      color: pr.color,
    })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export { buildFullProposal };
export default router;
