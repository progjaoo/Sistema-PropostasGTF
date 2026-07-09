import { Router } from "express";
import { prisma, type Prisma, type ProductTemplate } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { z } from "zod/v4";

const router = Router();

const productBody = z.object({
  programId: z.string().optional().nullable(),
  order: z.number().int().optional(),
  name: z.string().min(1),
  qty: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  detail: z.string().optional().nullable(),
  program: z.string().optional().nullable(),
  suggestedValueMin: z.string().optional().nullable(),
  suggestedValueMax: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  color: z.enum(["BLUE", "YELLOW", "RED", "GREEN", "DARK"]).optional(),
  active: z.boolean().optional(),
});

type ProductWithProgram = ProductTemplate & {
  programRef?: { id: string; name: string; slug: string } | null;
};

function formatTemplate(t: ProductWithProgram) {
  return {
    id: t.id,
    stationId: t.stationId,
    programId: t.programId ?? null,
    programName: t.programRef?.name ?? t.program ?? null,
    name: t.name,
    qty: t.qty,
    title: t.title,
    description: t.description ?? null,
    detail: t.detail ?? null,
    program: t.program ?? null,
    suggestedValueMin: t.suggestedValueMin ?? null,
    suggestedValueMax: t.suggestedValueMax ?? null,
    tags: t.tags ?? [],
    color: t.color,
    active: t.active,
    createdAt: t.createdAt.toISOString(),
  };
}

function parseMoney(value?: string | null) {
  if (!value) return null;
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const { programId, search, active, sort, minValue, maxValue } = req.query as {
    programId?: string;
    search?: string;
    active?: string;
    sort?: string;
    minValue?: string;
    maxValue?: string;
  };
  const where: Prisma.ProductTemplateWhereInput = {};
  if (programId) {
    where.programId = programId === "none" ? null : programId;
  }
  if (active !== undefined && active !== "all") {
    where.active = active === "true";
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.ProductTemplateOrderByWithRelationInput =
    sort === "name_desc"
      ? { name: "desc" }
      : sort === "newest"
        ? { createdAt: "desc" }
        : sort === "oldest"
          ? { createdAt: "asc" }
          : sort === "name_asc"
            ? { name: "asc" }
            : { order: "asc" };

  const templates = await prisma.productTemplate.findMany({
    where,
    include: { programRef: { select: { id: true, name: true, slug: true } } },
    orderBy,
  });
  const min = minValue ? Number.parseFloat(minValue) : null;
  const max = maxValue ? Number.parseFloat(maxValue) : null;
  const filtered = templates.filter((template) => {
    const templateMin = parseMoney(template.suggestedValueMin);
    const templateMax = parseMoney(template.suggestedValueMax);
    const comparableMin = templateMin ?? templateMax;
    const comparableMax = templateMax ?? templateMin;

    if (min !== null && (comparableMax === null || comparableMax < min)) return false;
    if (max !== null && (comparableMin === null || comparableMin > max)) return false;
    return true;
  });

  if (sort === "value_asc" || sort === "value_desc") {
    filtered.sort((a, b) => {
      const aValue = parseMoney(a.suggestedValueMin) ?? parseMoney(a.suggestedValueMax) ?? Number.POSITIVE_INFINITY;
      const bValue = parseMoney(b.suggestedValueMin) ?? parseMoney(b.suggestedValueMax) ?? Number.POSITIVE_INFINITY;
      return sort === "value_asc" ? aValue - bValue : bValue - aValue;
    });
  }

  res.json(filtered.map(formatTemplate));
});

router.post("/", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = productBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const station = await prisma.station.findFirst({ orderBy: { createdAt: "asc" } });
  if (!station) {
    res.status(400).json({ error: "No station configured" });
    return;
  }
  const t = await prisma.productTemplate.create({
    data: {
      ...parsed.data,
      stationId: station.id,
      qty: parsed.data.qty ?? "01",
      tags: parsed.data.tags ?? [],
      color: parsed.data.color ?? "BLUE",
      active: parsed.data.active ?? true,
    },
    include: { programRef: { select: { id: true, name: true, slug: true } } },
  });
  res.status(201).json(formatTemplate(t));
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = productBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const t = await prisma.productTemplate.update({
      where: { id: String(req.params["id"]) },
      data: parsed.data as Prisma.ProductTemplateUncheckedUpdateInput,
      include: { programRef: { select: { id: true, name: true, slug: true } } },
    });
    res.json(formatTemplate(t));
  } catch {
    res.status(404).json({ error: "Product not found" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  await prisma.productTemplate.deleteMany({ where: { id: String(req.params["id"]) } });
  res.json({ message: "Template deleted" });
});

export default router;
