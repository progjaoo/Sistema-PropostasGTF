import { Router } from "express";
import { prisma, type Prisma, type ProductTemplate } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { z } from "zod/v4";

const router = Router();

const productBody = z.object({
  stationId: z.string().optional().nullable(),
  programId: z.string().optional().nullable(),
  durationId: z.string().optional().nullable(),
  order: z.number().int().optional(),
  name: z.string().min(1).optional().nullable(),
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
  programRef?: { id: string; name: string; slug: string; stationId: string | null; station?: { id: string; name: string; primaryColor: string } | null } | null;
  duration?: { id: string; label: string; seconds: number | null } | null;
};

function formatTemplate(t: ProductWithProgram) {
  return {
    id: t.id,
    stationId: t.stationId,
    programId: t.programId ?? null,
    programName: t.programRef?.name ?? t.program ?? null,
    programStationId: t.programRef?.stationId ?? null,
    programStationName: t.programRef?.station?.name ?? null,
    programStationPrimaryColor: t.programRef?.station?.primaryColor ?? null,
    durationId: t.durationId ?? null,
    duration: t.duration
      ? {
          id: t.duration.id,
          label: t.duration.label,
          seconds: t.duration.seconds,
        }
      : null,
    durationLabel: t.duration?.label ?? null,
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function buildProductName(options: {
  stationId: string;
  title: string;
  programId?: string | null;
  durationId?: string | null;
  fallback?: string | null;
  excludeId?: string;
}) {
  if (options.fallback?.trim()) {
    return options.fallback.trim();
  }

  const [program, duration] = await Promise.all([
    options.programId ? prisma.proposalCategory.findUnique({ where: { id: options.programId } }) : Promise.resolve(null),
    options.durationId ? prisma.productDuration.findUnique({ where: { id: options.durationId } }) : Promise.resolve(null),
  ]);

  const base = slugify([program?.name, options.title, duration?.label].filter(Boolean).join(" ")) || slugify(options.title) || "produto";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.productTemplate.findFirst({
      where: {
        stationId: options.stationId,
        name: candidate,
        ...(options.excludeId ? { id: { not: options.excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function getProgramName(programId?: string | null) {
  if (!programId) return null;
  const program = await prisma.proposalCategory.findUnique({ where: { id: programId } });
  return program?.name ?? null;
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
    include: {
      programRef: { select: { id: true, name: true, slug: true, stationId: true, station: { select: { id: true, name: true, primaryColor: true } } } },
      duration: { select: { id: true, label: true, seconds: true } },
    },
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
  if (!parsed.data.programId) {
    res.status(400).json({ error: "Program is required" });
    return;
  }
  const program = await prisma.proposalCategory.findUnique({
    where: { id: parsed.data.programId },
    select: { id: true, name: true, stationId: true },
  });
  if (!program) {
    res.status(400).json({ error: "Program not found" });
    return;
  }
  if (parsed.data.stationId && parsed.data.stationId !== program.stationId) {
    res.status(400).json({ error: "Produto e programa devem pertencer à mesma empresa" });
    return;
  }
  const stationId = program.stationId ?? parsed.data.stationId ?? (await prisma.station.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } }))?.id;
  if (!stationId) {
    res.status(400).json({ error: "No station configured" });
    return;
  }
  const generatedName = await buildProductName({
    stationId,
    title: parsed.data.title,
    programId: parsed.data.programId,
    durationId: parsed.data.durationId,
    fallback: parsed.data.name,
  });
  const { stationId: _stationId, ...productData } = parsed.data;
  const t = await prisma.productTemplate.create({
    data: {
      ...productData,
      stationId,
      name: generatedName,
      qty: parsed.data.qty ?? "01",
      program: parsed.data.program ?? program.name,
      suggestedValueMax: parsed.data.suggestedValueMax ?? null,
      tags: parsed.data.tags ?? [],
      color: parsed.data.color ?? "BLUE",
      active: parsed.data.active ?? true,
    },
    include: {
      programRef: { select: { id: true, name: true, slug: true, stationId: true, station: { select: { id: true, name: true, primaryColor: true } } } },
      duration: { select: { id: true, label: true, seconds: true } },
    },
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
    const existing = await prisma.productTemplate.findUnique({ where: { id: String(req.params["id"]) } });
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const nextProgramId = parsed.data.programId === undefined ? existing.programId : parsed.data.programId;
    if (!nextProgramId) {
      res.status(400).json({ error: "Program is required" });
      return;
    }
    const nextProgram = await prisma.proposalCategory.findUnique({
      where: { id: nextProgramId },
      select: { id: true, name: true, stationId: true },
    });
    if (!nextProgram) {
      res.status(400).json({ error: "Program not found" });
      return;
    }
    if (nextProgram.stationId && nextProgram.stationId !== existing.stationId) {
      res.status(400).json({ error: "Produto não pode ser movido para programa de outra empresa" });
      return;
    }
    const nextDurationId = parsed.data.durationId === undefined ? existing.durationId : parsed.data.durationId;
    const nextTitle = parsed.data.title ?? existing.title;
    const shouldRegenerateName =
      !parsed.data.name &&
      (parsed.data.title !== undefined || parsed.data.programId !== undefined || parsed.data.durationId !== undefined);
    const generatedName = shouldRegenerateName
      ? await buildProductName({
          stationId: existing.stationId,
          title: nextTitle,
          programId: nextProgramId,
          durationId: nextDurationId,
          excludeId: existing.id,
        })
      : parsed.data.name?.trim();
    const programName = parsed.data.programId !== undefined ? nextProgram.name : undefined;
    const {
      name: _name,
      qty: _qty,
      stationId: _stationId,
      suggestedValueMax: _suggestedValueMax,
      ...updateInput
    } = parsed.data;
    const data: Prisma.ProductTemplateUncheckedUpdateInput = {
      ...updateInput,
      ...(generatedName ? { name: generatedName } : {}),
      ...(parsed.data.qty === undefined ? {} : { qty: parsed.data.qty ?? "01" }),
      ...(programName !== undefined ? { program: parsed.data.program ?? programName } : {}),
      ...(parsed.data.suggestedValueMax === undefined ? {} : { suggestedValueMax: parsed.data.suggestedValueMax ?? null }),
    };
    const t = await prisma.productTemplate.update({
      where: { id: String(req.params["id"]) },
      data,
      include: {
        programRef: { select: { id: true, name: true, slug: true, stationId: true, station: { select: { id: true, name: true, primaryColor: true } } } },
        duration: { select: { id: true, label: true, seconds: true } },
      },
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
