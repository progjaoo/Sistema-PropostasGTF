import { Router } from "express";
import { prisma, type Prisma } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod/v4";
import { buildFullProposal } from "./proposal-templates";

const router = Router();

const productInput = z.object({
  productTemplateId: z.string().optional().nullable(),
  order: z.number().int().optional(),
  qty: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  detail: z.string().optional().nullable(),
  program: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  color: z.enum(["BLUE", "YELLOW", "RED", "GREEN", "DARK"]).optional(),
});

const proposalInput = z.object({
  stationId: z.string().optional().nullable(),
  advertiserId: z.string().optional().nullable(),
  proposalTypeId: z.string().optional().nullable(),
  periodicity: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
  propType: z.string().optional(),
  propMonth: z.string().optional(),
  propYear: z.string().optional(),
  campTag: z.string().optional().nullable(),
  clientLine1: z.string().optional().nullable(),
  clientLine2: z.string().optional().nullable(),
  dateStart: z.string().optional().nullable(),
  dateEnd: z.string().optional().nullable(),
  periodDesc: z.string().optional().nullable(),
  bannerBase64: z.string().optional().nullable(),
  overlayOpacity: z.number().int().optional(),
  stats: z.unknown().optional(),
  investDesc: z.string().optional().nullable(),
  investValue: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactRole: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  products: z.array(productInput).optional(),
});

const statusInput = z.object({
  status: z.enum(["DRAFT", "SENT", "APPROVED", "REJECTED"]),
});

type ProposalSummaryRow = Prisma.ProposalGetPayload<{
  include: {
    advertiser: true;
    createdBy: true;
    fromTemplate: true;
    proposalType: true;
  };
}>;

async function buildSummary(p: ProposalSummaryRow) {
  return {
    id: p.id,
    status: p.status,
    propType: p.propType,
    propMonth: p.propMonth,
    propYear: p.propYear,
    campTag: p.campTag ?? null,
    clientLine1: p.clientLine1 ?? null,
    advertiserName: p.advertiser ? p.advertiser.tradeName : null,
    fromTemplateName: p.fromTemplate ? p.fromTemplate.name : null,
    createdByName: p.createdBy ? p.createdBy.name : "",
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const { page = "1", limit = "20", status, advertiserId, search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const where: Prisma.ProposalWhereInput = {};
  if (req.userRole !== "ADMIN") {
    where.createdById = req.userId!;
  }
  if (status) where.status = status as Prisma.EnumProposalStatusFilter["equals"];
  if (advertiserId) where.advertiserId = advertiserId;
  if (search) {
    where.OR = [
      { propType: { contains: search, mode: "insensitive" } },
      { clientLine1: { contains: search, mode: "insensitive" } },
      { campTag: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limitNum,
      skip: offset,
      include: { advertiser: true, createdBy: true, fromTemplate: true, proposalType: true },
    }),
    prisma.proposal.count({ where }),
  ]);

  const data = await Promise.all(rows.map(buildSummary));
  res.json({ data, total, page: pageNum, limit: limitNum });
});

router.post("/", requireAuth, async (req, res): Promise<void> => {
  const parsed = proposalInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const proposalType = parsed.data.proposalTypeId
    ? await prisma.proposalType.findUnique({ where: { id: parsed.data.proposalTypeId } })
    : null;
  const station = parsed.data.stationId
    ? await prisma.station.findUnique({ where: { id: parsed.data.stationId } })
    : await prisma.station.findFirst({ orderBy: { createdAt: "asc" } });
  if (!station) {
    res.status(400).json({ error: "No station found" });
    return;
  }
  const { products, ...rest } = parsed.data;
  const proposal = await prisma.proposal.create({
    data: {
      ...rest,
      stationId: station.id,
      createdById: req.userId!,
      proposalTypeId: rest.proposalTypeId ?? null,
      propType: proposalType?.name ?? rest.propType ?? "Proposta Comercial",
      propMonth: rest.propMonth ?? "",
      propYear: rest.propYear ?? "",
      periodicity: rest.periodicity ?? "MONTHLY",
      stats: rest.stats ?? [],
      products: products?.length
        ? {
            create: products.map((p, i) => ({
              productTemplateId: p.productTemplateId ?? null,
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

  await prisma.proposalVersion.create({
    data: {
      proposalId: proposal.id,
      snapshot: proposal,
      createdById: req.userId!,
    },
  });

  res.status(201).json(await buildFullProposal(proposal.id));
});

router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const full = await buildFullProposal(String(req.params["id"]));
  if (!full) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  if (req.userRole !== "ADMIN" && full.createdById !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(full);
});

router.patch("/:id", requireAuth, async (req, res): Promise<void> => {
  const parsed = proposalInput.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await prisma.proposal.findUnique({ where: { id: String(req.params["id"]) } });
  if (!existing) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  if (req.userRole !== "ADMIN" && existing.createdById !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { products, ...rest } = parsed.data;
  const proposalType = rest.proposalTypeId
    ? await prisma.proposalType.findUnique({ where: { id: rest.proposalTypeId } })
    : null;
  const data: Prisma.ProposalUncheckedUpdateInput = {
    ...rest,
    ...(proposalType ? { propType: proposalType.name } : {}),
  } as Prisma.ProposalUncheckedUpdateInput;

  const proposal = await prisma.$transaction(async (tx) => {
    const updated = await tx.proposal.update({
      where: { id: String(req.params["id"]) },
      data,
    });

    if (products !== undefined) {
      await tx.proposalProduct.deleteMany({ where: { proposalId: updated.id } });
      if (products.length > 0) {
        await tx.proposalProduct.createMany({
          data: products.map((p, i) => ({
            proposalId: updated.id,
            productTemplateId: p.productTemplateId ?? null,
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

    const versionCount = await tx.proposalVersion.count({ where: { proposalId: updated.id } });
    if (versionCount >= 50) {
      const oldest = await tx.proposalVersion.findFirst({
        where: { proposalId: updated.id },
        orderBy: { createdAt: "asc" },
      });
      if (oldest) {
        await tx.proposalVersion.delete({ where: { id: oldest.id } });
      }
    }
    await tx.proposalVersion.create({
      data: {
        proposalId: updated.id,
        snapshot: updated,
        createdById: req.userId!,
      },
    });
    return updated;
  });

  res.json(await buildFullProposal(proposal.id));
});

router.delete("/:id", requireAuth, async (req, res): Promise<void> => {
  const existing = await prisma.proposal.findUnique({ where: { id: String(req.params["id"]) } });
  if (!existing) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  if (req.userRole !== "ADMIN" && existing.createdById !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await prisma.proposal.update({
    where: { id: String(req.params["id"]) },
    data: { status: "REJECTED" },
  });
  res.json({ message: "Proposal rejected" });
});

router.patch("/:id/status", requireAuth, async (req, res): Promise<void> => {
  const parsed = statusInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const existing = await prisma.proposal.findUnique({ where: { id: String(req.params["id"]) } });
    if (!existing) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }
    if (req.userRole !== "ADMIN" && existing.createdById !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const proposal = await prisma.proposal.update({
      where: { id: String(req.params["id"]) },
      data: { status: parsed.data.status },
    });
    res.json(await buildFullProposal(proposal.id));
  } catch {
    res.status(404).json({ error: "Proposal not found" });
  }
});

router.post("/:id/duplicate", requireAuth, async (req, res): Promise<void> => {
  const existing = await prisma.proposal.findUnique({
    where: { id: String(req.params["id"]) },
  });
  if (!existing) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  if (req.userRole !== "ADMIN" && existing.createdById !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const products = await prisma.proposalProduct.findMany({
    where: { proposalId: existing.id },
    orderBy: { order: "asc" },
  });

  const newProposal = await prisma.proposal.create({
    data: {
      stationId: existing.stationId,
      advertiserId: existing.advertiserId,
      createdById: req.userId!,
      status: "DRAFT",
      fromTemplateId: existing.fromTemplateId,
      propType: existing.propType,
      propMonth: existing.propMonth,
      propYear: existing.propYear,
      campTag: existing.campTag,
      clientLine1: existing.clientLine1,
      clientLine2: existing.clientLine2,
      dateStart: existing.dateStart,
      dateEnd: existing.dateEnd,
      periodDesc: existing.periodDesc,
      bannerBase64: existing.bannerBase64,
      overlayOpacity: existing.overlayOpacity,
      stats: existing.stats ?? [],
      investDesc: existing.investDesc,
      investValue: existing.investValue,
      contactName: existing.contactName,
      contactRole: existing.contactRole,
      contactPhone: existing.contactPhone,
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
  res.status(201).json(await buildFullProposal(newProposal.id));
});

router.get("/:id/versions", requireAuth, async (req, res): Promise<void> => {
  const versions = await prisma.proposalVersion.findMany({
    where: { proposalId: String(req.params["id"]) },
    orderBy: { createdAt: "desc" },
  });
  res.json(versions.map((v) => ({
    id: v.id,
    proposalId: v.proposalId,
    snapshot: v.snapshot,
    createdAt: v.createdAt.toISOString(),
    createdById: v.createdById ?? null,
  })));
});

router.get("/:id/versions/:versionId", requireAuth, async (req, res): Promise<void> => {
  const v = await prisma.proposalVersion.findUnique({ where: { id: String(req.params["versionId"]) } });
  if (!v || v.proposalId !== String(req.params["id"])) {
    res.status(404).json({ error: "Version not found" });
    return;
  }
  res.json({
    id: v.id,
    proposalId: v.proposalId,
    snapshot: v.snapshot,
    createdAt: v.createdAt.toISOString(),
    createdById: v.createdById ?? null,
  });
});

export default router;
