import { Router } from "express";
import { prisma, type ProposalTemplate } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  CreateProposalTemplateBody,
  UpdateProposalTemplateBody,
} from "@workspace/api-zod";

const router = Router();

async function formatTemplate(t: ProposalTemplate, includeProducts = false) {
  const [cat, usageCount, products] = await Promise.all([
    prisma.proposalCategory.findUnique({ where: { id: t.categoryId } }),
    prisma.proposal.count({ where: { fromTemplateId: t.id } }),
    includeProducts
      ? prisma.proposalTemplateProduct.findMany({
          where: { templateId: t.id },
          orderBy: { order: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const base: Record<string, unknown> = {
    id: t.id,
    stationId: t.stationId,
    categoryId: t.categoryId,
    category: cat
      ? {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description ?? null,
          icon: cat.icon ?? null,
          active: cat.active,
          order: cat.order,
          createdAt: cat.createdAt.toISOString(),
          templateCount: 0,
        }
      : null,
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
  const rows = await prisma.proposalTemplate.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: { createdAt: "asc" },
  });
  const result = await Promise.all(rows.map((t) => formatTemplate(t, true)));
  res.json(result);
});

router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const t = await prisma.proposalTemplate.findUnique({ where: { id: String(req.params["id"]) } });
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
  const station = await prisma.station.findFirst({ orderBy: { createdAt: "asc" } });
  if (!station) {
    res.status(400).json({ error: "No station configured" });
    return;
  }
  const { products, ...rest } = parsed.data;
  const t = await prisma.proposalTemplate.create({
    data: {
      ...rest,
      stationId: station.id,
      stats: rest.stats ?? [],
      products: products?.length
        ? {
            create: products.map((p, i) => ({
              order: p.order ?? i,
              qty: p.qty ?? "01",
              title: p.title,
              description: p.description ?? null,
              detail: p.detail ?? null,
              program: p.program ?? null,
              tags: p.tags ?? [],
              color: p.color ?? "BLUE",
            })),
          }
        : undefined,
    },
  });
  res.status(201).json(await formatTemplate(t, true));
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateProposalTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { products, ...rest } = parsed.data;
  try {
    const t = await prisma.$transaction(async (tx) => {
      const updated = await tx.proposalTemplate.update({
        where: { id: String(req.params["id"]) },
        data: rest,
      });
      if (products !== undefined) {
        await tx.proposalTemplateProduct.deleteMany({ where: { templateId: updated.id } });
        if (products.length > 0) {
          await tx.proposalTemplateProduct.createMany({
            data: products.map((p, i) => ({
              templateId: updated.id,
              order: p.order ?? i,
              qty: p.qty ?? "01",
              title: p.title,
              description: p.description ?? null,
              detail: p.detail ?? null,
              program: p.program ?? null,
              tags: p.tags ?? [],
              color: p.color ?? "BLUE",
            })),
          });
        }
      }
      return updated;
    });
    res.json(await formatTemplate(t, true));
  } catch {
    res.status(404).json({ error: "Template not found" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  await prisma.proposalTemplate.deleteMany({ where: { id: String(req.params["id"]) } });
  res.json({ message: "Template deleted" });
});

router.post("/:id/use", requireAuth, async (req, res): Promise<void> => {
  const t = await prisma.proposalTemplate.findUnique({
    where: { id: String(req.params["id"]) },
  });
  if (!t) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  const products = await prisma.proposalTemplateProduct.findMany({
    where: { templateId: t.id },
    orderBy: { order: "asc" },
  });

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear());

  const proposal = await prisma.proposal.create({
    data: {
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
      products: products.length
        ? {
            create: products.map((p) => ({
              order: p.order,
              qty: p.qty,
              title: p.title,
              description: p.description,
              detail: p.detail,
              program: p.program,
              tags: p.tags,
              color: p.color,
            })),
          }
        : undefined,
    },
  });

  await prisma.proposalVersion.create({
    data: {
      proposalId: proposal.id,
      snapshot: proposal,
      createdById: req.userId!,
    },
  });

  const fullProposal = await buildFullProposal(proposal.id);
  res.status(201).json(fullProposal);
});

async function buildFullProposal(id: string) {
  const p = await prisma.proposal.findUnique({
    where: { id },
    include: {
      station: true,
      advertiser: true,
      createdBy: true,
      fromTemplate: true,
      proposalType: true,
      products: {
        orderBy: { order: "asc" },
        include: {
          productTemplate: {
            select: {
              suggestedValueMin: true,
              suggestedValueMax: true,
            },
          },
        },
      },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    stationId: p.stationId,
    station: p.station
      ? {
          id: p.station.id,
          name: p.station.name,
          slogan: p.station.slogan ?? null,
          logoBase64: p.station.logoBase64 ?? null,
          tradeName: p.station.tradeName ?? null,
          legalName: p.station.legalName ?? null,
          cnpj: p.station.cnpj ?? null,
          contactName: p.station.contactName ?? null,
          contactPhone: p.station.contactPhone ?? null,
          contactEmail: p.station.contactEmail ?? null,
          address: p.station.address ?? null,
          city: p.station.city ?? null,
          state: p.station.state ?? null,
          website: p.station.website ?? null,
          createdAt: p.station.createdAt.toISOString(),
        }
      : null,
    advertiserId: p.advertiserId ?? null,
    advertiser: p.advertiser
      ? {
          id: p.advertiser.id,
          tradeName: p.advertiser.tradeName,
          legalName: p.advertiser.legalName ?? null,
          cnpj: p.advertiser.cnpj ?? null,
          contactName: p.advertiser.contactName ?? null,
          contactPhone: p.advertiser.contactPhone ?? null,
          contactEmail: p.advertiser.contactEmail ?? null,
          active: p.advertiser.active,
          createdAt: p.advertiser.createdAt.toISOString(),
        }
      : null,
    createdById: p.createdById,
    createdBy: p.createdBy
      ? {
          id: p.createdBy.id,
          name: p.createdBy.name,
          email: p.createdBy.email,
          role: p.createdBy.role,
          active: p.createdBy.active,
          jobTitle: p.createdBy.jobTitle ?? null,
          contactPhone: p.createdBy.contactPhone ?? null,
          contactEmail: p.createdBy.contactEmail ?? null,
          avatarBase64: p.createdBy.avatarBase64 ?? null,
          createdAt: p.createdBy.createdAt.toISOString(),
        }
      : null,
    status: p.status,
    fromTemplateId: p.fromTemplateId ?? null,
    fromTemplateName: p.fromTemplate ? p.fromTemplate.name : null,
    proposalTypeId: p.proposalTypeId ?? null,
    proposalTypeName: p.proposalType?.name ?? null,
    periodicity: p.periodicity,
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
    products: p.products.map((pr) => ({
      id: pr.id,
      productTemplateId: pr.productTemplateId ?? null,
      order: pr.order,
      qty: pr.qty,
      title: pr.title,
      description: pr.description ?? null,
      detail: pr.detail ?? null,
      program: pr.program ?? null,
      suggestedValueMin: pr.productTemplate?.suggestedValueMin ?? null,
      suggestedValueMax: pr.productTemplate?.suggestedValueMax ?? null,
      tags: pr.tags ?? [],
      color: pr.color,
    })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export { buildFullProposal };
export default router;
