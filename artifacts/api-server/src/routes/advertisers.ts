import { Router } from "express";
import { prisma, type Prisma } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod/v4";
import { optionalImageDataUrlSchema, registerIdParamValidation } from "../lib/validation";

const router = Router();
registerIdParamValidation(router);
const createAdvertiserBody = z.object({
  tradeName: z.string().trim().min(2).max(120),
  legalName: z.string().max(120).optional(),
  cnpj: z.string().max(32).optional(),
  logoBase64: optionalImageDataUrlSchema.optional(),
  segment: z.string().max(120).optional(),
  contactName: z.string().max(120).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.union([z.string().email().max(254), z.literal("")]).optional(),
  notes: z.string().max(2_000).optional(),
  status: z.enum(["LEAD", "CLIENT"]).optional(),
}).strict();
const updateAdvertiserBody = z.object({
  tradeName: z.string().trim().min(2).max(120).optional(),
  legalName: z.string().max(120).optional(),
  cnpj: z.string().max(32).optional(),
  logoBase64: optionalImageDataUrlSchema.optional(),
  segment: z.string().max(120).optional(),
  contactName: z.string().max(120).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.union([z.string().email().max(254), z.literal("")]).optional(),
  notes: z.string().max(2_000).optional(),
  active: z.boolean().optional(),
  status: z.enum(["LEAD", "CLIENT"]).optional(),
}).strict();
const advertiserListQuery = z.object({
  search: z.string().max(200).optional(),
  active: z.enum(["true", "false"]).optional(),
  status: z.enum(["LEAD", "CLIENT"]).optional(),
}).strict();

type AdvertiserRow = Prisma.AdvertiserGetPayload<{
  include: {
    proposals: {
      include: {
        createdBy: { select: { id: true; name: true } };
        products: {
          include: {
            productTemplate: {
              include: {
                programRef: { select: { name: true } };
              };
            };
          };
        };
        timeline: {
          include: {
            createdBy: { select: { id: true; name: true } };
          };
        };
      };
    };
  };
}>;

const visibleProposalStatuses = ["DRAFT", "SENT", "APPROVED", "REJECTED"] as const;

const timelineStepLabels: Record<string, string> = {
  LEAD_CREATED: "Lead criado",
  IN_CONVERSATION: "Em conversa",
  PROPOSAL_SENT: "Proposta enviada",
  CLIENT_REVIEWING: "Cliente analisando",
  NEGOTIATION: "Negociação",
  APPROVED: "Aceita",
  REJECTED: "Rejeitada",
};

function formatProgramNames(products: AdvertiserRow["proposals"][number]["products"]) {
  const names = products
    .map((product) => product.productTemplate?.programRef?.name ?? product.program)
    .filter((name): name is string => Boolean(name?.trim()))
    .map((name) => name.trim());
  const uniqueNames = Array.from(new Set(names));

  if (uniqueNames.length === 0) return "Programa não informado";
  if (uniqueNames.length <= 2) return uniqueNames.join(", ");
  return `${uniqueNames.slice(0, 2).join(", ")} +${uniqueNames.length - 2}`;
}

function formatAdvertiser(a: AdvertiserRow, viewer: { userId?: string; role?: string }) {
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
    status: a.status,
    active: a.active,
    proposals: a.proposals.map((p) => {
      const viewerCanEdit = viewer.role === "ADMIN" || p.createdById === viewer.userId;
      const lastTimeline = p.timeline[0] ?? null;
      return {
        id: p.id,
        status: p.status,
        propType: viewerCanEdit ? p.propType : null,
        propMonth: viewerCanEdit ? p.propMonth : null,
        propYear: viewerCanEdit ? p.propYear : null,
        campTag: viewerCanEdit ? p.campTag ?? null : null,
        clientLine1: viewerCanEdit ? p.clientLine1 ?? null : null,
        investValue: viewerCanEdit ? p.investValue ?? null : null,
        programName: formatProgramNames(p.products),
        createdById: p.createdById,
        createdByName: p.createdBy?.name ?? "",
        lastTimelineStep: lastTimeline
          ? {
              id: lastTimeline.id,
              step: lastTimeline.step,
              label: timelineStepLabels[lastTimeline.step] ?? lastTimeline.step,
              note: lastTimeline.note ?? null,
              createdByName: lastTimeline.createdBy?.name ?? null,
              createdAt: lastTimeline.createdAt.toISOString(),
            }
          : null,
        viewerCanEdit,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    }),
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const query = advertiserListQuery.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Filtros de clientes invalidos", fields: query.error.issues });
    return;
  }
  const { search, active, status } = query.data;
  const where: Prisma.AdvertiserWhereInput = {};

  if (status) {
    if (status !== "LEAD" && status !== "CLIENT") {
      res.status(400).json({ error: "Invalid advertiser status" });
      return;
    }
    where.status = status;
  }
  if (active !== undefined) {
    where.active = active === "true";
  }
  if (search) {
    where.OR = [
      { tradeName: { contains: search, mode: "insensitive" } },
      { legalName: { contains: search, mode: "insensitive" } },
      { cnpj: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.advertiser.findMany({
    where,
    orderBy: { tradeName: "asc" },
    include: {
      proposals: {
        where: { status: { in: [...visibleProposalStatuses] } },
        include: {
          createdBy: { select: { id: true, name: true } },
          products: {
            include: {
              productTemplate: {
                include: { programRef: { select: { name: true } } },
              },
            },
          },
          timeline: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { createdBy: { select: { id: true, name: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  res.json(rows.map((row) => formatAdvertiser(row, { userId: req.userId, role: req.userRole })));
});

router.post("/", requireAuth, async (req, res): Promise<void> => {
  const parsed = createAdvertiserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const adv = await prisma.advertiser.create({
    data: parsed.data,
    include: {
      proposals: {
        include: {
          createdBy: { select: { id: true, name: true } },
          products: {
            include: {
              productTemplate: {
                include: { programRef: { select: { name: true } } },
              },
            },
          },
          timeline: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { createdBy: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  res.status(201).json(formatAdvertiser(adv, { userId: req.userId, role: req.userRole }));
});

router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const adv = await prisma.advertiser.findUnique({
    where: { id: String(req.params["id"]) },
    include: {
      proposals: {
        where: { status: { in: [...visibleProposalStatuses] } },
        include: {
          createdBy: { select: { id: true, name: true } },
          products: {
            include: {
              productTemplate: {
                include: { programRef: { select: { name: true } } },
              },
            },
          },
          timeline: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { createdBy: { select: { id: true, name: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!adv) {
    res.status(404).json({ error: "Advertiser not found" });
    return;
  }
  res.json(formatAdvertiser(adv, { userId: req.userId, role: req.userRole }));
});

router.patch("/:id", requireAuth, async (req, res): Promise<void> => {
  const parsed = updateAdvertiserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const adv = await prisma.advertiser.update({
      where: { id: String(req.params["id"]) },
      data: parsed.data,
      include: {
        proposals: {
          where: { status: { in: [...visibleProposalStatuses] } },
          include: {
            createdBy: { select: { id: true, name: true } },
            products: {
              include: {
                productTemplate: {
                  include: { programRef: { select: { name: true } } },
                },
              },
            },
            timeline: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { createdBy: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    res.json(formatAdvertiser(adv, { userId: req.userId, role: req.userRole }));
  } catch {
    res.status(404).json({ error: "Advertiser not found" });
  }
});

router.delete("/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const adv = await prisma.advertiser.update({
      where: { id: String(req.params["id"]) },
      data: { active: false },
      include: {
        proposals: {
          where: { status: { in: [...visibleProposalStatuses] } },
          include: {
            createdBy: { select: { id: true, name: true } },
            products: {
              include: {
                productTemplate: {
                  include: { programRef: { select: { name: true } } },
                },
              },
            },
            timeline: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { createdBy: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    res.json(formatAdvertiser(adv, { userId: req.userId, role: req.userRole }));
  } catch {
    res.status(404).json({ error: "Advertiser not found" });
  }
});

export default router;
