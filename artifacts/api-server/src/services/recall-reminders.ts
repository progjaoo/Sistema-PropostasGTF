import { type Prisma } from "@workspace/db";

export const RECALL_MILESTONE_MONTHS = [3, 6, 10] as const;
export const RECALL_SNOOZE_DAYS = [7, 15, 30] as const;

export type RecallMilestoneMonths = (typeof RECALL_MILESTONE_MONTHS)[number];
export type RecallSnoozeDays = (typeof RECALL_SNOOZE_DAYS)[number];

type RejectedProposalForReminder = {
  id: string;
  advertiserId: string | null;
  createdById: string;
};

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const originalDay = next.getDate();
  next.setMonth(next.getMonth() + months);

  // If the target month is shorter, JS rolls forward. Clamp to the last day.
  if (next.getDate() !== originalDay) {
    next.setDate(0);
  }

  return next;
}

export function isAllowedSnoozeDay(value: number): value is RecallSnoozeDays {
  return RECALL_SNOOZE_DAYS.includes(value as RecallSnoozeDays);
}

export async function createRecallRemindersForRejectedProposal(
  tx: Prisma.TransactionClient,
  proposal: RejectedProposalForReminder,
  rejectedAt: Date,
) {
  await Promise.all(
    RECALL_MILESTONE_MONTHS.map((months) =>
      tx.proposalRecallReminder.upsert({
        where: {
          proposalId_milestoneMonths: {
            proposalId: proposal.id,
            milestoneMonths: months,
          },
        },
        create: {
          proposalId: proposal.id,
          advertiserId: proposal.advertiserId,
          assignedToId: proposal.createdById,
          milestoneMonths: months,
          rejectedAt,
          dueAt: addMonths(rejectedAt, months),
          status: "PENDING",
        },
        update: {
          advertiserId: proposal.advertiserId,
          assignedToId: proposal.createdById,
          rejectedAt,
          dueAt: addMonths(rejectedAt, months),
          snoozedUntil: null,
          status: "PENDING",
          lastNotifiedAt: null,
          handledAt: null,
          handledById: null,
          note: null,
        },
      }),
    ),
  );
}

export async function cancelPendingRecallRemindersForProposal(
  tx: Prisma.TransactionClient,
  proposalId: string,
) {
  await tx.proposalRecallReminder.updateMany({
    where: {
      proposalId,
      status: { in: ["PENDING", "NOTIFIED", "SNOOZED"] },
    },
    data: {
      status: "CANCELLED",
      snoozedUntil: null,
    },
  });
}

export function buildVisibleRecallReminderWhere(args: {
  userId: string;
  userRole?: string;
  includeFuture?: boolean;
  assignedToId?: string;
  stationId?: string;
  milestoneMonths?: number;
  status?: string;
  search?: string;
}) {
  const now = new Date();
  const where: Prisma.ProposalRecallReminderWhereInput = {};

  if (args.userRole !== "ADMIN") {
    where.assignedToId = args.userId;
  } else if (args.assignedToId && args.assignedToId !== "all") {
    where.assignedToId = args.assignedToId;
  }

  if (args.stationId && args.stationId !== "all") {
    where.proposal = { stationId: args.stationId };
  }

  if (args.milestoneMonths && RECALL_MILESTONE_MONTHS.includes(args.milestoneMonths as RecallMilestoneMonths)) {
    where.milestoneMonths = args.milestoneMonths;
  }

  if (args.status && args.status !== "active" && args.status !== "all") {
    where.status = args.status as Prisma.EnumProposalRecallReminderStatusFilter["equals"];
  } else if (args.includeFuture) {
    where.status = { in: ["PENDING", "NOTIFIED", "SNOOZED"] };
  } else {
    where.OR = [
      { status: { in: ["PENDING", "NOTIFIED"] }, dueAt: { lte: now } },
      { status: "SNOOZED", snoozedUntil: { lte: now } },
    ];
  }

  const cleanSearch = args.search?.trim();
  if (cleanSearch) {
    const searchWhere: Prisma.ProposalRecallReminderWhereInput = {
      OR: [
        { advertiser: { tradeName: { contains: cleanSearch, mode: "insensitive" } } },
        { proposal: { propType: { contains: cleanSearch, mode: "insensitive" } } },
        { proposal: { clientLine1: { contains: cleanSearch, mode: "insensitive" } } },
        { proposal: { proposalType: { name: { contains: cleanSearch, mode: "insensitive" } } } },
        { assignedTo: { name: { contains: cleanSearch, mode: "insensitive" } } },
      ],
    };
    const currentAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [...currentAnd, searchWhere];
  }

  return where;
}

export function getRecallReminderDueDate(reminder: {
  status: string;
  dueAt: Date;
  snoozedUntil: Date | null;
}) {
  return reminder.status === "SNOOZED" && reminder.snoozedUntil ? reminder.snoozedUntil : reminder.dueAt;
}

