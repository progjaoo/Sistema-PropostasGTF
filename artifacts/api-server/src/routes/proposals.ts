import { Router } from "express";
import { prisma, type Prisma } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod/v4";
import { buildFullProposal } from "./proposal-templates";
import {
  cancelPendingRecallRemindersForProposal,
  createRecallRemindersForRejectedProposal,
} from "../services/recall-reminders";

const router = Router();

const productInput = z.object({
  productTemplateId: z.string().optional().nullable(),
  order: z.number().int().optional(),
  qty: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  detail: z.string().optional().nullable(),
  program: z.string().optional().nullable(),
  durationLabel: z.string().optional().nullable(),
  airTime: z.string().optional().nullable(),
  seasonality: z.enum(["MONTHLY", "SEMIANNUAL", "ANNUAL"]).optional().nullable(),
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

const manualTimelineInput = z.object({
  step: z.enum(["IN_CONVERSATION", "PROPOSAL_SENT", "CLIENT_REVIEWING", "NEGOTIATION"]),
  note: z.string().max(500).optional().nullable(),
});

const TIMELINE_STEP_LABELS: Record<string, string> = {
  LEAD_CREATED: "Lead criado",
  IN_CONVERSATION: "Em conversa",
  PROPOSAL_SENT: "Proposta enviada",
  CLIENT_REVIEWING: "Cliente analisando",
  NEGOTIATION: "Negociação",
  APPROVED: "Aceita",
  REJECTED: "Rejeitada",
};

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  APPROVED: "Aceita",
  REJECTED: "Rejeitada",
};

type ProposalSummaryRow = Prisma.ProposalGetPayload<{
  include: {
    advertiser: true;
    station: true;
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
    advertiserTradeName: p.advertiser ? p.advertiser.tradeName : null,
    stationId: p.stationId,
    stationName: p.station ? p.station.name : null,
    fromTemplateName: p.fromTemplate ? p.fromTemplate.name : null,
    proposalTypeId: p.proposalTypeId ?? null,
    proposalTypeName: p.proposalType?.name ?? null,
    createdById: p.createdById,
    createdByName: p.createdBy ? p.createdBy.name : "",
    investValue: p.investValue ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function formatMoney(value?: string | null) {
  return value ?? null;
}

function formatTimelineEntry(entry: {
  id: string;
  proposalId: string;
  step: string;
  note: string | null;
  createdAt: Date;
  createdById: string | null;
  createdBy?: { id: string; name: string } | null;
}) {
  return {
    id: entry.id,
    proposalId: entry.proposalId,
    step: entry.step,
    label: TIMELINE_STEP_LABELS[entry.step] ?? entry.step,
    note: entry.note ?? null,
    createdById: entry.createdById ?? null,
    createdByName: entry.createdBy?.name ?? null,
    createdAt: entry.createdAt.toISOString(),
  };
}

async function addTimelineEntry(
  tx: Prisma.TransactionClient,
  data: {
    proposalId: string;
    step: "LEAD_CREATED" | "IN_CONVERSATION" | "PROPOSAL_SENT" | "CLIENT_REVIEWING" | "NEGOTIATION" | "APPROVED" | "REJECTED";
    note?: string | null;
    createdById?: string | null;
  },
) {
  const entry = await tx.proposalTimeline.create({
    data: {
      proposalId: data.proposalId,
      step: data.step,
      note: data.note?.trim() || null,
      createdById: data.createdById ?? null,
    },
  });
  const count = await tx.proposalTimeline.count({ where: { proposalId: data.proposalId } });
  if (count > 50) {
    const extra = await tx.proposalTimeline.findMany({
      where: { proposalId: data.proposalId },
      orderBy: { createdAt: "asc" },
      take: count - 50,
      select: { id: true },
    });
    if (extra.length) {
      await tx.proposalTimeline.deleteMany({ where: { id: { in: extra.map((item) => item.id) } } });
    }
  }
  return entry;
}

function resolveProgramFromProduct(product: {
  program?: string | null;
  productTemplate?: {
    programId?: string | null;
    program?: string | null;
    programRef?: { id: string; name: string; stationId?: string | null } | null;
  } | null;
}) {
  return {
    id: product.productTemplate?.programRef?.id ?? product.productTemplate?.programId ?? null,
    name: product.productTemplate?.programRef?.name ?? product.productTemplate?.program ?? product.program ?? "Sem programa",
    stationId: product.productTemplate?.programRef?.stationId ?? null,
  };
}

router.get("/program-board", requireAuth, async (req, res): Promise<void> => {
  const { search, stationId, programId, status } = req.query as Record<string, string | undefined>;
  const cleanSearch = search?.trim();
  const cleanStationId = stationId && stationId !== "all" ? stationId : undefined;
  const cleanProgramId = programId && programId !== "all" ? programId : undefined;
  const cleanStatus = status && status !== "all" ? status : undefined;

  const proposalWhere: Prisma.ProposalWhereInput = {};
  if (req.userRole !== "ADMIN") {
    proposalWhere.createdById = req.userId!;
  }
  if (cleanStationId) {
    proposalWhere.stationId = cleanStationId;
  }
  if (cleanStatus) {
    proposalWhere.status = cleanStatus as Prisma.EnumProposalStatusFilter["equals"];
  }
  if (cleanSearch) {
    proposalWhere.OR = [
      { propType: { contains: cleanSearch, mode: "insensitive" } },
      { clientLine1: { contains: cleanSearch, mode: "insensitive" } },
      { campTag: { contains: cleanSearch, mode: "insensitive" } },
      { advertiser: { tradeName: { contains: cleanSearch, mode: "insensitive" } } },
      { products: { some: { title: { contains: cleanSearch, mode: "insensitive" } } } },
      { products: { some: { program: { contains: cleanSearch, mode: "insensitive" } } } },
      { products: { some: { productTemplate: { title: { contains: cleanSearch, mode: "insensitive" } } } } },
      { products: { some: { productTemplate: { programRef: { name: { contains: cleanSearch, mode: "insensitive" } } } } } },
    ];
  }
  if (cleanProgramId) {
    proposalWhere.products = {
      some: {
        OR: [
          { productTemplate: { programId: cleanProgramId } },
        ],
      },
    };
  }

  const [programs, proposals] = await Promise.all([
    prisma.proposalCategory.findMany({
      where: {
        active: true,
        ...(cleanStationId ? { stationId: cleanStationId } : {}),
        ...(cleanProgramId ? { id: cleanProgramId } : {}),
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        station: { select: { id: true, name: true, primaryColor: true } },
        products: {
          where: {
            active: true,
            ...(cleanStationId ? { stationId: cleanStationId } : {}),
          },
          orderBy: [{ order: "asc" }, { title: "asc" }],
          include: {
            station: { select: { id: true, name: true } },
            duration: { select: { label: true } },
          },
        },
      },
    }),
    prisma.proposal.findMany({
      where: proposalWhere,
      orderBy: { updatedAt: "desc" },
      include: {
        advertiser: { select: { id: true, tradeName: true, status: true } },
        station: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        proposalType: { select: { id: true, name: true } },
        products: {
          orderBy: { order: "asc" },
          include: {
            productTemplate: {
              select: {
                id: true,
                title: true,
                program: true,
                programId: true,
                suggestedValueMin: true,
                duration: { select: { label: true } },
                programRef: { select: { id: true, name: true, stationId: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const board = new Map<string, {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    stationId: string | null;
    stationName: string | null;
    primaryColor: string | null;
    products: Array<Record<string, unknown>>;
    proposals: Array<Record<string, unknown>>;
  }>();

  programs.forEach((program) => {
    board.set(program.id, {
      id: program.id,
      name: program.name,
      slug: program.slug,
      description: program.description ?? null,
      icon: program.icon ?? null,
      stationId: program.stationId,
      stationName: program.station?.name ?? null,
      primaryColor: program.station?.primaryColor ?? "#427EFF",
      products: program.products.map((product) => ({
        id: product.id,
        title: product.title,
        description: product.description ?? null,
        stationId: product.stationId,
        stationName: product.station?.name ?? null,
        durationLabel: product.duration?.label ?? null,
        suggestedValueMin: formatMoney(product.suggestedValueMin),
      })),
      proposals: [],
    });
  });

  const ensureProgram = (id: string, name: string) => {
    if (!board.has(id)) {
      board.set(id, {
        id,
        name,
        slug: id,
        description: null,
        icon: null,
        stationId: null,
        stationName: null,
        primaryColor: null,
        products: [],
        proposals: [],
      });
    }
    return board.get(id)!;
  };

  proposals.forEach((proposal) => {
    const programKeys = new Map<string, string>();

    proposal.products.forEach((product) => {
      const resolved = resolveProgramFromProduct(product);
      if (cleanStationId && resolved.stationId && resolved.stationId !== cleanStationId) {
        return;
      }
      if (resolved.id) {
        programKeys.set(resolved.id, resolved.name);
      }
    });

    if (programKeys.size === 0 && !cleanProgramId) {
      programKeys.set("sem-programa", "Sem programa");
    }

    const proposalSummary = {
      id: proposal.id,
      status: proposal.status,
      advertiserId: proposal.advertiserId ?? null,
      advertiserName: proposal.advertiser?.tradeName ?? proposal.clientLine1 ?? "Sem cliente",
      stationName: proposal.station?.name ?? null,
      proposalTypeName: proposal.proposalType?.name ?? proposal.propType,
      createdByName: proposal.createdBy?.name ?? "",
      investValue: proposal.investValue ?? null,
      updatedAt: proposal.updatedAt.toISOString(),
      products: proposal.products.map((product) => ({
        id: product.id,
        title: product.title,
        qty: product.qty,
        airTime: product.airTime ?? null,
        durationLabel: product.durationLabel ?? product.productTemplate?.duration?.label ?? null,
        seasonality: product.seasonality ?? null,
        programName: resolveProgramFromProduct(product).name,
      })),
    };

    programKeys.forEach((name, id) => {
      ensureProgram(id, name).proposals.push(proposalSummary);
    });
  });

  let data = Array.from(board.values());
  if (cleanSearch) {
    const needle = cleanSearch.toLowerCase();
    data = data.filter((program) => {
      const programMatches = `${program.name} ${program.description ?? ""}`.toLowerCase().includes(needle);
      const productMatches = program.products.some((product) => `${product.title ?? ""} ${product.description ?? ""}`.toLowerCase().includes(needle));
      return programMatches || productMatches || program.proposals.length > 0;
    });
  }

  res.json({ programs: data });
});

router.get("/progress-board", requireAuth, async (req, res): Promise<void> => {
  const { search, stationId, programId, status } = req.query as Record<string, string | undefined>;
  const cleanSearch = search?.trim();
  const cleanStationId = stationId && stationId !== "all" ? stationId : undefined;
  const cleanProgramId = programId && programId !== "all" ? programId : undefined;
  const cleanStatus = status && status !== "all" ? status : undefined;

  const proposalWhere: Prisma.ProposalWhereInput = {};
  if (req.userRole !== "ADMIN") {
    proposalWhere.createdById = req.userId!;
  }
  if (cleanStationId) {
    proposalWhere.stationId = cleanStationId;
  }
  if (cleanStatus) {
    proposalWhere.status = cleanStatus as Prisma.EnumProposalStatusFilter["equals"];
  }
  if (cleanSearch) {
    proposalWhere.OR = [
      { propType: { contains: cleanSearch, mode: "insensitive" } },
      { clientLine1: { contains: cleanSearch, mode: "insensitive" } },
      { campTag: { contains: cleanSearch, mode: "insensitive" } },
      { advertiser: { tradeName: { contains: cleanSearch, mode: "insensitive" } } },
      { createdBy: { name: { contains: cleanSearch, mode: "insensitive" } } },
      { products: { some: { title: { contains: cleanSearch, mode: "insensitive" } } } },
      { products: { some: { program: { contains: cleanSearch, mode: "insensitive" } } } },
      { products: { some: { productTemplate: { title: { contains: cleanSearch, mode: "insensitive" } } } } },
      { products: { some: { productTemplate: { programRef: { name: { contains: cleanSearch, mode: "insensitive" } } } } } },
    ];
  }
  if (cleanProgramId) {
    proposalWhere.products = {
      some: {
        productTemplate: { programId: cleanProgramId },
      },
    };
  }

  const [programs, proposals] = await Promise.all([
    prisma.proposalCategory.findMany({
      where: {
        active: true,
        ...(cleanStationId ? { stationId: cleanStationId } : {}),
        ...(cleanProgramId ? { id: cleanProgramId } : {}),
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        station: { select: { id: true, name: true, primaryColor: true } },
      },
    }),
    prisma.proposal.findMany({
      where: proposalWhere,
      orderBy: { updatedAt: "desc" },
      include: {
        advertiser: { select: { id: true, tradeName: true, status: true } },
        station: { select: { id: true, name: true, primaryColor: true } },
        createdBy: { select: { id: true, name: true } },
        proposalType: { select: { id: true, name: true } },
        timeline: {
          orderBy: { createdAt: "asc" },
          include: { createdBy: { select: { id: true, name: true } } },
        },
        products: {
          orderBy: { order: "asc" },
          include: {
            productTemplate: {
              select: {
                id: true,
                title: true,
                program: true,
                programId: true,
                duration: { select: { label: true } },
                programRef: { select: { id: true, name: true, stationId: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const board = new Map<string, {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    stationId: string | null;
    stationName: string | null;
    primaryColor: string | null;
    proposalCount: number;
    proposals: Array<Record<string, unknown>>;
  }>();

  programs.forEach((program) => {
    board.set(program.id, {
      id: program.id,
      name: program.name,
      slug: program.slug,
      description: program.description ?? null,
      icon: program.icon ?? null,
      stationId: program.stationId,
      stationName: program.station?.name ?? null,
      primaryColor: program.station?.primaryColor ?? "#427EFF",
      proposalCount: 0,
      proposals: [],
    });
  });

  const ensureProgram = (id: string, name: string) => {
    if (!board.has(id)) {
      board.set(id, {
        id,
        name,
        slug: id,
        description: null,
        icon: null,
        stationId: null,
        stationName: null,
        primaryColor: null,
        proposalCount: 0,
        proposals: [],
      });
    }
    return board.get(id)!;
  };

  proposals.forEach((proposal) => {
    const programKeys = new Map<string, string>();

    proposal.products.forEach((product) => {
      const resolved = resolveProgramFromProduct(product);
      if (cleanStationId && resolved.stationId && resolved.stationId !== cleanStationId) {
        return;
      }
      if (resolved.id) {
        programKeys.set(resolved.id, resolved.name);
      }
    });

    if (programKeys.size === 0 && !cleanProgramId) {
      programKeys.set("sem-programa", "Sem programa");
    }

    const viewerCanEdit = req.userRole === "ADMIN" || proposal.createdById === req.userId;
    const proposalSummary = {
      id: proposal.id,
      status: proposal.status,
      statusLabel: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status,
      viewerCanEdit,
      advertiserId: proposal.advertiserId ?? null,
      advertiserName: proposal.advertiser?.tradeName ?? proposal.clientLine1 ?? "Sem cliente",
      advertiserStatus: proposal.advertiser?.status ?? null,
      stationId: proposal.stationId ?? null,
      stationName: proposal.station?.name ?? null,
      primaryColor: proposal.station?.primaryColor ?? "#427EFF",
      proposalTypeName: proposal.proposalType?.name ?? proposal.propType,
      createdByName: proposal.createdBy?.name ?? "",
      investValue: proposal.investValue ?? null,
      updatedAt: proposal.updatedAt.toISOString(),
      products: proposal.products.map((product) => ({
        id: product.id,
        title: product.title,
        qty: product.qty,
        airTime: product.airTime ?? null,
        durationLabel: product.durationLabel ?? product.productTemplate?.duration?.label ?? null,
        seasonality: product.seasonality ?? null,
        programName: resolveProgramFromProduct(product).name,
      })),
      timeline: proposal.timeline.map(formatTimelineEntry),
    };

    programKeys.forEach((name, id) => {
      const program = ensureProgram(id, name);
      program.proposals.push(proposalSummary);
      program.proposalCount = program.proposals.length;
    });
  });

  let data = Array.from(board.values());
  if (cleanSearch) {
    const needle = cleanSearch.toLowerCase();
    data = data.filter((program) => {
      const programMatches = `${program.name} ${program.description ?? ""}`.toLowerCase().includes(needle);
      return programMatches || program.proposals.length > 0;
    });
  }

  res.json({ programs: data });
});

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const {
    page = "1",
    limit = "20",
    status,
    advertiserId,
    search,
    stationId,
    proposalTypeId,
    createdById,
    dateFrom,
    dateTo,
    sortBy = "updatedAt",
    sortDir = "desc",
  } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;
  const cleanStatus = status && status !== "all" ? status : undefined;
  const cleanStationId = stationId && stationId !== "all" ? stationId : undefined;
  const cleanProposalTypeId = proposalTypeId && proposalTypeId !== "all" ? proposalTypeId : undefined;
  const cleanCreatedById = createdById && createdById !== "all" ? createdById : undefined;
  const cleanSortBy = sortBy === "createdAt" ? "createdAt" : "updatedAt";
  const cleanSortDir = sortDir === "asc" ? "asc" : "desc";

  const where: Prisma.ProposalWhereInput = {};
  if (req.userRole !== "ADMIN") {
    where.createdById = req.userId!;
  }
  if (cleanStatus) where.status = cleanStatus as Prisma.EnumProposalStatusFilter["equals"];
  if (advertiserId) where.advertiserId = advertiserId;
  if (cleanStationId) where.stationId = cleanStationId;
  if (cleanProposalTypeId) where.proposalTypeId = cleanProposalTypeId;
  if (cleanCreatedById && req.userRole === "ADMIN") where.createdById = cleanCreatedById;
  if (dateFrom || dateTo) {
    where.updatedAt = {};
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00.000Z`);
      if (!Number.isNaN(from.getTime())) where.updatedAt.gte = from;
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999Z`);
      if (!Number.isNaN(to.getTime())) where.updatedAt.lte = to;
    }
  }
  if (search) {
    const cleanSearch = search.trim();
    where.OR = [
      { propType: { contains: cleanSearch, mode: "insensitive" } },
      { clientLine1: { contains: cleanSearch, mode: "insensitive" } },
      { campTag: { contains: cleanSearch, mode: "insensitive" } },
      { advertiser: { tradeName: { contains: cleanSearch, mode: "insensitive" } } },
      { station: { name: { contains: cleanSearch, mode: "insensitive" } } },
      { createdBy: { name: { contains: cleanSearch, mode: "insensitive" } } },
      { proposalType: { name: { contains: cleanSearch, mode: "insensitive" } } },
      { products: { some: { title: { contains: cleanSearch, mode: "insensitive" } } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      orderBy: { [cleanSortBy]: cleanSortDir },
      take: limitNum,
      skip: offset,
      include: { advertiser: true, station: true, createdBy: true, fromTemplate: true, proposalType: true },
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
  const proposal = await prisma.$transaction(async (tx) => {
    const created = await tx.proposal.create({
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
                durationLabel: p.durationLabel ?? null,
                airTime: p.airTime ?? null,
                seasonality: p.seasonality ?? null,
                tags: p.tags ?? [],
                color: p.color ?? "BLUE",
              })),
            }
          : undefined,
      },
    });

    if (created.advertiserId) {
      const advertiser = await tx.advertiser.findUnique({
        where: { id: created.advertiserId },
        select: { status: true },
      });
      if (advertiser?.status === "LEAD") {
        await addTimelineEntry(tx, {
          proposalId: created.id,
          step: "LEAD_CREATED",
          note: "Proposta iniciada para lead.",
          createdById: req.userId!,
        });
      }
    }

    await tx.proposalVersion.create({
      data: {
        proposalId: created.id,
        snapshot: created,
        createdById: req.userId!,
      },
    });

    return created;
  });

  res.status(201).json(await buildFullProposal(proposal.id));
});

router.get("/:id/timeline", requireAuth, async (req, res): Promise<void> => {
  const proposal = await prisma.proposal.findUnique({
    where: { id: String(req.params["id"]) },
    select: { id: true, createdById: true },
  });
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  if (req.userRole !== "ADMIN" && proposal.createdById !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const entries = await prisma.proposalTimeline.findMany({
    where: { proposalId: proposal.id },
    orderBy: { createdAt: "asc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  res.json(entries.map(formatTimelineEntry));
});

router.post("/:id/timeline", requireAuth, async (req, res): Promise<void> => {
  const parsed = manualTimelineInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: String(req.params["id"]) },
    select: { id: true, createdById: true },
  });
  if (!proposal) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }
  if (req.userRole !== "ADMIN" && proposal.createdById !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const entry = await prisma.$transaction((tx) =>
    addTimelineEntry(tx, {
      proposalId: proposal.id,
      step: parsed.data.step,
      note: parsed.data.note,
      createdById: req.userId!,
    }),
  );
  const fullEntry = await prisma.proposalTimeline.findUnique({
    where: { id: entry.id },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  res.status(201).json(fullEntry ? formatTimelineEntry(fullEntry) : formatTimelineEntry(entry));
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
            durationLabel: p.durationLabel ?? null,
            airTime: p.airTime ?? null,
            seasonality: p.seasonality ?? null,
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
  await prisma.$transaction(async (tx) => {
    const updated = await tx.proposal.update({
      where: { id: String(req.params["id"]) },
      data: { status: "REJECTED" },
    });
    const rejectedEntry = await addTimelineEntry(tx, {
      proposalId: String(req.params["id"]),
      step: "REJECTED",
      note: "Proposta marcada como rejeitada.",
      createdById: req.userId!,
    });
    await createRecallRemindersForRejectedProposal(tx, updated, rejectedEntry.createdAt);
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
    const proposal = await prisma.$transaction(async (tx) => {
      const updated = await tx.proposal.update({
        where: { id: String(req.params["id"]) },
        data: { status: parsed.data.status },
      });

      if (parsed.data.status === "APPROVED" && updated.advertiserId) {
        await tx.advertiser.update({
          where: { id: updated.advertiserId },
          data: { status: "CLIENT" },
        });
      }
      if (parsed.data.status === "APPROVED") {
        await cancelPendingRecallRemindersForProposal(tx, updated.id);
      }
      if (parsed.data.status === "APPROVED" || parsed.data.status === "REJECTED") {
        const timelineEntry = await addTimelineEntry(tx, {
          proposalId: updated.id,
          step: parsed.data.status,
          note: parsed.data.status === "APPROVED" ? "Proposta aceita pelo cliente." : "Proposta rejeitada.",
          createdById: req.userId!,
        });
        if (parsed.data.status === "REJECTED") {
          await createRecallRemindersForRejectedProposal(tx, updated, timelineEntry.createdAt);
        }
      }

      return updated;
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
              durationLabel: p.durationLabel,
              airTime: p.airTime,
              seasonality: p.seasonality,
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
