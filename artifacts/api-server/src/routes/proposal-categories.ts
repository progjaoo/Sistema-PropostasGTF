import { Router } from "express";
import { prisma, type Prisma } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { z } from "zod/v4";

const router = Router();

const programBody = z.object({
  stationId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
  productIds: z.array(z.string()).optional(),
});

async function getCategories(options: { search?: string; active?: string; sort?: string; stationId?: string } = {}) {
  const where: Prisma.ProposalCategoryWhereInput = {
    ...(options.stationId && options.stationId !== "all" ? { stationId: options.stationId } : {}),
    ...(options.active !== undefined && options.active !== "all"
      ? { active: options.active === "true" }
      : {}),
    ...(options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: "insensitive" as const } },
            { slug: { contains: options.search, mode: "insensitive" as const } },
            { description: { contains: options.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const orderBy =
    options.sort === "name_asc"
      ? { name: "asc" as const }
      : options.sort === "name_desc"
        ? { name: "desc" as const }
        : options.sort === "newest"
          ? { createdAt: "desc" as const }
          : options.sort === "oldest"
            ? { createdAt: "asc" as const }
            : { order: "asc" as const };
  const cats = await prisma.proposalCategory.findMany({
    where,
    orderBy,
    include: {
      station: {
        select: {
          id: true,
          name: true,
          primaryColor: true,
        },
      },
      products: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          stationId: true,
          programId: true,
          name: true,
          qty: true,
          title: true,
          durationId: true,
          duration: { select: { id: true, label: true, seconds: true } },
          description: true,
          detail: true,
          suggestedValueMin: true,
          suggestedValueMax: true,
          color: true,
          order: true,
        },
      },
      _count: { select: { products: true } },
    },
  });
  const result = cats.map((c) => ({
    id: c.id,
    stationId: c.stationId,
    station: c.station
      ? {
          id: c.station.id,
          name: c.station.name,
          primaryColor: c.station.primaryColor ?? "#427EFF",
        }
      : null,
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    icon: c.icon ?? null,
    active: c.active,
    order: c.order,
    createdAt: c.createdAt.toISOString(),
    templateCount: c._count.products,
    productCount: c._count.products,
    products: c.products.map((p) => ({
      id: p.id,
      stationId: p.stationId,
      programId: p.programId ?? null,
      name: p.name,
      qty: p.qty,
      title: p.title,
      durationId: p.durationId ?? null,
      duration: p.duration
        ? {
            id: p.duration.id,
            label: p.duration.label,
            seconds: p.duration.seconds,
          }
        : null,
      durationLabel: p.duration?.label ?? null,
      description: p.description ?? null,
      detail: p.detail ?? null,
      suggestedValueMin: p.suggestedValueMin ?? null,
      suggestedValueMax: p.suggestedValueMax ?? null,
      color: p.color,
      order: p.order,
    })),
  }));

  if (options.sort === "products_count_desc") {
    return result.sort((a, b) => b.productCount - a.productCount);
  }
  if (options.sort === "products_count_asc") {
    return result.sort((a, b) => a.productCount - b.productCount);
  }
  return result;
}

async function syncProgramProducts(programId: string, stationId: string, productIds: string[] | undefined) {
  if (!productIds) return;
  const distinctIds = [...new Set(productIds)];

  if (distinctIds.length) {
    const count = await prisma.productTemplate.count({
      where: {
        id: { in: distinctIds },
        stationId,
      },
    });
    if (count !== distinctIds.length) {
      throw new Error("Todos os produtos vinculados devem pertencer à mesma empresa do programa");
    }
  }

  await prisma.$transaction([
    prisma.productTemplate.updateMany({
      where: {
        programId,
        id: { notIn: distinctIds },
      },
      data: { programId: null },
    }),
    prisma.productTemplate.updateMany({
      where: {
        id: { in: distinctIds },
        stationId,
      },
      data: { programId },
    }),
  ]);
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const { search, active, sort, stationId } = req.query as { search?: string; active?: string; sort?: string; stationId?: string };
  res.json(await getCategories({ search, active, sort, stationId }));
});

router.post("/", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = programBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { productIds, ...data } = parsed.data;
  const station = await prisma.station.findUnique({ where: { id: data.stationId } });
  if (!station) {
    res.status(400).json({ error: "Empresa não encontrada" });
    return;
  }
  const cat = await prisma.proposalCategory.create({
    data: {
      ...data,
      description: data.description ?? null,
      icon: data.icon ?? null,
      active: data.active ?? true,
      order: data.order ?? 0,
    },
  });
  await syncProgramProducts(cat.id, cat.stationId!, productIds);
  const cats = await getCategories({ stationId: cat.stationId! });
  res.status(201).json(cats.find((c) => c.id === cat.id));
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = programBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const { productIds, ...data } = parsed.data;
    const existing = await prisma.proposalCategory.findUnique({ where: { id: String(req.params["id"]) } });
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    const stationId = data.stationId ?? existing.stationId;
    if (!stationId) {
      res.status(400).json({ error: "Empresa é obrigatória para salvar o programa" });
      return;
    }
    if (data.stationId) {
      const station = await prisma.station.findUnique({ where: { id: data.stationId } });
      if (!station) {
        res.status(400).json({ error: "Empresa não encontrada" });
        return;
      }
    }
    const cat = await prisma.proposalCategory.update({
      where: { id: String(req.params["id"]) },
      data,
    });
    await syncProgramProducts(cat.id, stationId, productIds);
    const cats = await getCategories({ stationId });
    const updated = cats.find((c) => c.id === cat.id);
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Category not found" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  await prisma.proposalCategory.deleteMany({ where: { id: String(req.params["id"]) } });
  res.json({ message: "Category deleted" });
});

export default router;
