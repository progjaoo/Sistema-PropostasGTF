import { Router } from "express";
import {
  db,
  proposalsTable,
  proposalTemplatesTable,
  proposalCategoriesTable,
  advertisersTable,
  usersTable,
} from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/stats", requireAuth, async (req, res): Promise<void> => {
  const isAdmin = req.userRole === "ADMIN";
  const base = db.select({
    status: proposalsTable.status,
    count: sql<number>`count(*)::int`,
  }).from(proposalsTable);

  const rows = isAdmin
    ? await base.groupBy(proposalsTable.status)
    : await base.where(eq(proposalsTable.createdById, req.userId!)).groupBy(proposalsTable.status);

  const stats: Record<string, number> = { draft: 0, sent: 0, approved: 0, rejected: 0, archived: 0 };
  let total = 0;
  for (const r of rows) {
    const key = r.status.toLowerCase();
    stats[key] = r.count;
    total += r.count;
  }
  res.json({ total, ...stats });
});

router.get("/recent-proposals", requireAuth, async (req, res): Promise<void> => {
  const isAdmin = req.userRole === "ADMIN";
  const rows = isAdmin
    ? await db.select().from(proposalsTable).orderBy(desc(proposalsTable.updatedAt)).limit(5)
    : await db.select().from(proposalsTable).where(eq(proposalsTable.createdById, req.userId!)).orderBy(desc(proposalsTable.updatedAt)).limit(5);

  const result = await Promise.all(
    rows.map(async (p) => {
      const [adv] = p.advertiserId ? await db.select().from(advertisersTable).where(eq(advertisersTable.id, p.advertiserId)) : [null];
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.createdById));
      const [template] = p.fromTemplateId ? await db.select().from(proposalTemplatesTable).where(eq(proposalTemplatesTable.id, p.fromTemplateId)) : [null];
      return {
        id: p.id,
        status: p.status,
        propType: p.propType,
        propMonth: p.propMonth,
        propYear: p.propYear,
        campTag: p.campTag ?? null,
        clientLine1: p.clientLine1 ?? null,
        advertiserName: adv ? adv.tradeName : null,
        fromTemplateName: template ? template.name : null,
        createdByName: user ? user.name : "",
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    })
  );
  res.json(result);
});

router.get("/template-usage", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      templateId: proposalsTable.fromTemplateId,
      count: sql<number>`count(*)::int`,
    })
    .from(proposalsTable)
    .where(sql`${proposalsTable.fromTemplateId} IS NOT NULL`)
    .groupBy(proposalsTable.fromTemplateId)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const result = await Promise.all(
    rows.map(async (r) => {
      const [t] = r.templateId ? await db.select().from(proposalTemplatesTable).where(eq(proposalTemplatesTable.id, r.templateId)) : [null];
      const [cat] = t ? await db.select().from(proposalCategoriesTable).where(eq(proposalCategoriesTable.id, t.categoryId)) : [null];
      return {
        templateId: r.templateId ?? "",
        templateName: t ? t.name : "Unknown",
        categoryName: cat ? cat.name : "Unknown",
        usageCount: r.count,
      };
    })
  );
  res.json(result);
});

export default router;
