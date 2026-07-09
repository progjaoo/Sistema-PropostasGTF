import { Router } from "express";
import { prisma, type Prisma } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { CreateAdvertiserBody, UpdateAdvertiserBody } from "@workspace/api-zod";

const router = Router();

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
      };
    };
  };
}>;

const visibleProposalStatuses = ["DRAFT", "SENT", "APPROVED", "REJECTED"] as const;

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
    active: a.active,
    proposals: a.proposals.map((p) => {
      const viewerCanEdit = viewer.role === "ADMIN" || p.createdById === viewer.userId;
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
        viewerCanEdit,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    }),
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const { search, active } = req.query as { search?: string; active?: string };
  const where: Prisma.AdvertiserWhereInput = {};

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
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  res.json(rows.map((row) => formatAdvertiser(row, { userId: req.userId, role: req.userRole })));
});

router.post("/", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAdvertiserBody.safeParse(req.body);
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
  const parsed = UpdateAdvertiserBody.safeParse(req.body);
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
