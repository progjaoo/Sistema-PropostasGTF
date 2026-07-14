import { Router } from "express";
import { prisma, type Prisma } from "@workspace/db";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/auth";
import {
  buildVisibleRecallReminderWhere,
  getRecallReminderDueDate,
  isAllowedSnoozeDay,
} from "../services/recall-reminders";

const router = Router();

const listQuery = z.object({
  search: z.string().optional(),
  stationId: z.string().optional(),
  assignedToId: z.string().optional(),
  milestoneMonths: z.coerce.number().int().optional(),
  status: z.enum(["active", "all", "PENDING", "NOTIFIED", "SNOOZED", "DONE", "CANCELLED"]).optional(),
  includeFuture: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const snoozeInput = z.object({
  days: z.coerce.number().int(),
});

const doneInput = z.object({
  note: z.string().max(500).optional().nullable(),
});

const reminderInclude = {
  advertiser: { select: { id: true, tradeName: true, status: true } },
  assignedTo: { select: { id: true, name: true } },
  handledBy: { select: { id: true, name: true } },
  proposal: {
    select: {
      id: true,
      status: true,
      propType: true,
      investValue: true,
      updatedAt: true,
      station: { select: { id: true, name: true, primaryColor: true } },
      proposalType: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ProposalRecallReminderInclude;

type ReminderRow = Prisma.ProposalRecallReminderGetPayload<{
  include: typeof reminderInclude;
}>;

const REMINDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  NOTIFIED: "Avisado",
  SNOOZED: "Reagendado",
  DONE: "Tratado",
  CANCELLED: "Cancelado",
};

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  APPROVED: "Aceita",
  REJECTED: "Rejeitada",
  ARCHIVED: "Arquivada",
};

const ADVERTISER_STATUS_LABELS: Record<string, string> = {
  LEAD: "Lead",
  CLIENT: "Cliente",
};

function accessWhereForReminder(id: string, req: Express.Request): Prisma.ProposalRecallReminderWhereInput {
  return {
    id,
    ...(req.userRole === "ADMIN" ? {} : { assignedToId: req.userId! }),
  };
}

function formatReminder(reminder: ReminderRow) {
  return {
    id: reminder.id,
    milestoneMonths: reminder.milestoneMonths,
    rejectedAt: reminder.rejectedAt.toISOString(),
    dueAt: reminder.dueAt.toISOString(),
    effectiveDueAt: getRecallReminderDueDate(reminder).toISOString(),
    snoozedUntil: reminder.snoozedUntil?.toISOString() ?? null,
    status: reminder.status,
    statusLabel: REMINDER_STATUS_LABELS[reminder.status] ?? reminder.status,
    lastNotifiedAt: reminder.lastNotifiedAt?.toISOString() ?? null,
    handledAt: reminder.handledAt?.toISOString() ?? null,
    note: reminder.note ?? null,
    proposal: {
      id: reminder.proposal.id,
      status: reminder.proposal.status,
      statusLabel: PROPOSAL_STATUS_LABELS[reminder.proposal.status] ?? reminder.proposal.status,
      propType: reminder.proposal.proposalType?.name ?? reminder.proposal.propType,
      proposalTypeName: reminder.proposal.proposalType?.name ?? null,
      investValue: reminder.proposal.investValue ?? null,
      updatedAt: reminder.proposal.updatedAt.toISOString(),
    },
    advertiser: reminder.advertiser
      ? {
          id: reminder.advertiser.id,
          name: reminder.advertiser.tradeName,
          status: reminder.advertiser.status,
          statusLabel: ADVERTISER_STATUS_LABELS[reminder.advertiser.status] ?? reminder.advertiser.status,
        }
      : null,
    station: reminder.proposal.station
      ? {
          id: reminder.proposal.station.id,
          name: reminder.proposal.station.name,
          primaryColor: reminder.proposal.station.primaryColor,
        }
      : null,
    assignedTo: reminder.assignedTo
      ? {
          id: reminder.assignedTo.id,
          name: reminder.assignedTo.name,
        }
      : null,
    handledBy: reminder.handledBy
      ? {
          id: reminder.handledBy.id,
          name: reminder.handledBy.name,
        }
      : null,
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const includeFuture = req.userRole === "ADMIN" && parsed.data.includeFuture === "true";
  const where = buildVisibleRecallReminderWhere({
    userId: req.userId!,
    userRole: req.userRole,
    includeFuture,
    assignedToId: parsed.data.assignedToId,
    stationId: parsed.data.stationId,
    milestoneMonths: parsed.data.milestoneMonths,
    status: parsed.data.status ?? "active",
    search: parsed.data.search,
  });
  const limit = parsed.data.limit ?? 20;

  const [items, total, due] = await Promise.all([
    prisma.proposalRecallReminder.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: limit,
      include: reminderInclude,
    }),
    prisma.proposalRecallReminder.count({ where }),
    prisma.proposalRecallReminder.count({
      where: buildVisibleRecallReminderWhere({
        userId: req.userId!,
        userRole: req.userRole,
        status: "active",
      }),
    }),
  ]);

  res.json({
    items: items.map(formatReminder),
    meta: {
      total,
      due,
    },
  });
});

router.get("/count", requireAuth, async (req, res): Promise<void> => {
  const due = await prisma.proposalRecallReminder.count({
    where: buildVisibleRecallReminderWhere({
      userId: req.userId!,
      userRole: req.userRole,
      status: "active",
    }),
  });

  res.json({ due });
});

router.patch("/:id/notify", requireAuth, async (req, res): Promise<void> => {
  const reminder = await prisma.proposalRecallReminder.findFirst({
    where: accessWhereForReminder(String(req.params["id"]), req),
    include: reminderInclude,
  });
  if (!reminder) {
    res.status(404).json({ error: "Reminder not found" });
    return;
  }

  const updated = await prisma.proposalRecallReminder.update({
    where: { id: reminder.id },
    data: {
      lastNotifiedAt: new Date(),
      status: reminder.status === "PENDING" ? "NOTIFIED" : reminder.status,
    },
    include: reminderInclude,
  });

  res.json(formatReminder(updated));
});

router.patch("/:id/snooze", requireAuth, async (req, res): Promise<void> => {
  const parsed = snoozeInput.safeParse(req.body);
  if (!parsed.success || !isAllowedSnoozeDay(parsed.data.days)) {
    res.status(400).json({ error: "Invalid snooze period" });
    return;
  }

  const reminder = await prisma.proposalRecallReminder.findFirst({
    where: accessWhereForReminder(String(req.params["id"]), req),
  });
  if (!reminder) {
    res.status(404).json({ error: "Reminder not found" });
    return;
  }

  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + parsed.data.days);

  const updated = await prisma.proposalRecallReminder.update({
    where: { id: reminder.id },
    data: {
      status: "SNOOZED",
      snoozedUntil,
    },
    include: reminderInclude,
  });

  res.json(formatReminder(updated));
});

router.patch("/:id/done", requireAuth, async (req, res): Promise<void> => {
  const parsed = doneInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const reminder = await prisma.proposalRecallReminder.findFirst({
    where: accessWhereForReminder(String(req.params["id"]), req),
  });
  if (!reminder) {
    res.status(404).json({ error: "Reminder not found" });
    return;
  }

  const updated = await prisma.proposalRecallReminder.update({
    where: { id: reminder.id },
    data: {
      status: "DONE",
      handledAt: new Date(),
      handledById: req.userId!,
      note: parsed.data.note?.trim() || null,
    },
    include: reminderInclude,
  });

  res.json(formatReminder(updated));
});

export default router;

