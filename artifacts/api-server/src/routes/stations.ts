import { Router } from "express";
import { prisma, type Station } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { z } from "zod/v4";

const router = Router();

const stationBody = z.object({
  name: z.string().min(1),
  slogan: z.string().optional().nullable(),
  logoBase64: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  tradeName: z.string().optional().nullable(),
  legalName: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

function formatStation(s: Station) {
  return {
    id: s.id,
    name: s.name,
    slogan: s.slogan ?? null,
    logoBase64: s.logoBase64 ?? null,
    cnpj: s.cnpj ?? null,
    tradeName: s.tradeName ?? null,
    legalName: s.legalName ?? null,
    contactName: s.contactName ?? null,
    contactPhone: s.contactPhone ?? null,
    contactEmail: s.contactEmail ?? null,
    address: s.address ?? null,
    city: s.city ?? null,
    state: s.state ?? null,
    website: s.website ?? null,
    notes: s.notes ?? null,
    active: s.active,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const stations = await prisma.station.findMany({ orderBy: { createdAt: "asc" } });
  res.json(stations.map(formatStation));
});

router.post("/", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = stationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const station = await prisma.station.create({ data: parsed.data });
  res.status(201).json(formatStation(station));
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = stationBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const station = await prisma.station.update({
      where: { id: String(req.params["id"]) },
      data: parsed.data,
    });
    res.json(formatStation(station));
  } catch {
    res.status(404).json({ error: "Company not found" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  try {
    const station = await prisma.station.update({
      where: { id: String(req.params["id"]) },
      data: { active: false },
    });
    res.json(formatStation(station));
  } catch {
    res.status(404).json({ error: "Company not found" });
  }
});

export default router;
