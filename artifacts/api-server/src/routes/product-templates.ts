import { Router } from "express";
import { db, productTemplatesTable, stationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { CreateProductTemplateBody, UpdateProductTemplateBody } from "@workspace/api-zod";

const router = Router();

function formatTemplate(t: typeof productTemplatesTable.$inferSelect) {
  return {
    id: t.id,
    stationId: t.stationId,
    name: t.name,
    qty: t.qty,
    title: t.title,
    description: t.description ?? null,
    detail: t.detail ?? null,
    program: t.program ?? null,
    tags: t.tags ?? [],
    color: t.color,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const templates = await db.select().from(productTemplatesTable).orderBy(productTemplatesTable.order);
  res.json(templates.map(formatTemplate));
});

router.post("/", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProductTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [station] = await db.select().from(stationsTable).limit(1);
  if (!station) {
    res.status(400).json({ error: "No station configured" });
    return;
  }
  const [t] = await db
    .insert(productTemplatesTable)
    .values({ ...parsed.data, stationId: station.id, color: (parsed.data.color ?? "BLUE") as "BLUE" | "YELLOW" | "RED" | "GREEN" | "DARK" })
    .returning();
  res.status(201).json(formatTemplate(t));
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateProductTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Partial<typeof productTemplatesTable.$inferInsert> = { ...parsed.data };
  if (parsed.data.color) updates.color = parsed.data.color as "BLUE" | "YELLOW" | "RED" | "GREEN" | "DARK";
  const [t] = await db
    .update(productTemplatesTable)
    .set(updates)
    .where(eq(productTemplatesTable.id, req.params["id"]!))
    .returning();
  if (!t) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(formatTemplate(t));
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  await db.delete(productTemplatesTable).where(eq(productTemplatesTable.id, req.params["id"]!));
  res.json({ message: "Template deleted" });
});

export default router;
