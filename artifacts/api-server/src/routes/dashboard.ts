import { Router } from "express";
import { prisma } from "@workspace/db";
import { requireAdmin, requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/stats", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await prisma.proposal.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const stats: Record<string, number> = { draft: 0, sent: 0, approved: 0, rejected: 0, archived: 0 };
  let total = 0;
  for (const r of rows) {
    const key = r.status.toLowerCase();
    stats[key] = r._count._all;
    total += r._count._all;
  }
  res.json({ total, ...stats });
});

router.get("/recent-proposals", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await prisma.proposal.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { advertiser: true, createdBy: true, fromTemplate: true },
  });

  const result = rows.map((p) => ({
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
  }));
  res.json(result);
});

router.get("/template-usage", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await prisma.proposal.groupBy({
    by: ["fromTemplateId"],
    where: { fromTemplateId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { fromTemplateId: "desc" } },
    take: 10,
  });

  const result = await Promise.all(
    rows.map(async (r) => {
      const t = r.fromTemplateId
        ? await prisma.proposalTemplate.findUnique({
            where: { id: r.fromTemplateId },
            include: { category: true },
          })
        : null;
      return {
        templateId: r.fromTemplateId ?? "",
        templateName: t ? t.name : "Unknown",
        categoryName: t?.category ? t.category.name : "Unknown",
        usageCount: r._count._all,
      };
    })
  );
  res.json(result);
});

export default router;
