import { Router } from "express";
import { db, proposalCategoriesTable, proposalTemplatesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { CreateProposalCategoryBody, UpdateProposalCategoryBody } from "@workspace/api-zod";

const router = Router();

async function getCategories() {
  const cats = await db.select().from(proposalCategoriesTable).orderBy(proposalCategoriesTable.order);
  const counts = await db
    .select({ categoryId: proposalTemplatesTable.categoryId, count: sql<number>`count(*)::int` })
    .from(proposalTemplatesTable)
    .groupBy(proposalTemplatesTable.categoryId);
  const countMap = Object.fromEntries(counts.map((c) => [c.categoryId, c.count]));
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    icon: c.icon ?? null,
    active: c.active,
    order: c.order,
    createdAt: c.createdAt.toISOString(),
    templateCount: countMap[c.id] ?? 0,
  }));
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  res.json(await getCategories());
});

router.post("/", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProposalCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cat] = await db.insert(proposalCategoriesTable).values(parsed.data).returning();
  res.status(201).json({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description ?? null,
    icon: cat.icon ?? null,
    active: cat.active,
    order: cat.order,
    createdAt: cat.createdAt.toISOString(),
    templateCount: 0,
  });
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateProposalCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cat] = await db
    .update(proposalCategoriesTable)
    .set(parsed.data)
    .where(eq(proposalCategoriesTable.id, req.params["id"]!))
    .returning();
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  const cats = await getCategories();
  const updated = cats.find((c) => c.id === cat.id);
  res.json(updated);
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  await db.delete(proposalCategoriesTable).where(eq(proposalCategoriesTable.id, req.params["id"]!));
  res.json({ message: "Category deleted" });
});

export default router;
