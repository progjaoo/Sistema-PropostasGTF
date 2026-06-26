import { Router } from "express";
import { db, advertisersTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateAdvertiserBody, UpdateAdvertiserBody } from "@workspace/api-zod";

const router = Router();

function formatAdvertiser(a: typeof advertisersTable.$inferSelect) {
  return {
    id: a.id,
    tradeName: a.tradeName,
    legalName: a.legalName ?? null,
    cnpj: a.cnpj ?? null,
    logoBase64: a.logoBase64 ?? null,
    contactName: a.contactName ?? null,
    contactPhone: a.contactPhone ?? null,
    contactEmail: a.contactEmail ?? null,
    notes: a.notes ?? null,
    active: a.active,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const { search, active } = req.query as { search?: string; active?: string };
  let query = db.select().from(advertisersTable);

  const conditions = [];
  if (active !== undefined) {
    conditions.push(eq(advertisersTable.active, active === "true"));
  }
  if (search) {
    conditions.push(
      or(
        ilike(advertisersTable.tradeName, `%${search}%`),
        ilike(advertisersTable.legalName, `%${search}%`),
        ilike(advertisersTable.cnpj, `%${search}%`)
      )!
    );
  }

  const rows = conditions.length > 0
    ? await db.select().from(advertisersTable).where(conditions.length === 1 ? conditions[0] : conditions[0])
    : await db.select().from(advertisersTable).orderBy(advertisersTable.tradeName);

  res.json(rows.map(formatAdvertiser));
});

router.post("/", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAdvertiserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [adv] = await db.insert(advertisersTable).values(parsed.data).returning();
  res.status(201).json(formatAdvertiser(adv));
});

router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const [adv] = await db.select().from(advertisersTable).where(eq(advertisersTable.id, req.params["id"]!));
  if (!adv) {
    res.status(404).json({ error: "Advertiser not found" });
    return;
  }
  res.json(formatAdvertiser(adv));
});

router.patch("/:id", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateAdvertiserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [adv] = await db
    .update(advertisersTable)
    .set(parsed.data)
    .where(eq(advertisersTable.id, req.params["id"]!))
    .returning();
  if (!adv) {
    res.status(404).json({ error: "Advertiser not found" });
    return;
  }
  res.json(formatAdvertiser(adv));
});

router.delete("/:id", requireAuth, async (req, res): Promise<void> => {
  const [adv] = await db
    .update(advertisersTable)
    .set({ active: false })
    .where(eq(advertisersTable.id, req.params["id"]!))
    .returning();
  if (!adv) {
    res.status(404).json({ error: "Advertiser not found" });
    return;
  }
  res.json(formatAdvertiser(adv));
});

export default router;
