import { Router } from "express";
import { db, stationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { CreateStationBody, UpdateStationBody } from "@workspace/api-zod";

const router = Router();

function formatStation(s: typeof stationsTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    slogan: s.slogan ?? null,
    logoBase64: s.logoBase64 ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const stations = await db.select().from(stationsTable).orderBy(stationsTable.createdAt);
  res.json(stations.map(formatStation));
});

router.post("/", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateStationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [station] = await db.insert(stationsTable).values(parsed.data).returning();
  res.status(201).json(formatStation(station));
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateStationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [station] = await db
    .update(stationsTable)
    .set(parsed.data)
    .where(eq(stationsTable.id, req.params["id"]!))
    .returning();
  if (!station) {
    res.status(404).json({ error: "Station not found" });
    return;
  }
  res.json(formatStation(station));
});

export default router;
