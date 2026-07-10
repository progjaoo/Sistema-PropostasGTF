import { Router } from "express";
import { prisma } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { z } from "zod/v4";

const router = Router();

const durationBody = z.object({
  label: z.string().min(1),
  seconds: z.number().int().positive().optional().nullable(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
});

function normalizeDurationLabel(label: string, seconds?: number | null) {
  const trimmed = label.trim().replace(/\s+/g, " ");
  const numeric = trimmed.match(/^\d+$/)?.[0];
  if (numeric) return `${numeric}s`;

  const secondsLike = trimmed.match(/^(\d+)\s*(s|seg|segs|segundo|segundos)$/i)?.[1];
  if (secondsLike) return `${secondsLike}s`;

  if (!trimmed && seconds) return `${seconds}s`;
  return trimmed;
}

function inferSeconds(label: string, seconds?: number | null) {
  if (seconds && Number.isFinite(seconds)) return seconds;
  const match = label.match(/^(\d+)\s*(s|seg|segs|segundo|segundos)?$/i);
  if (!match) return null;
  const value = Number.parseInt(match[1]!, 10);
  return Number.isFinite(value) ? value : null;
}

function formatDuration(duration: {
  id: string;
  label: string;
  seconds: number | null;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: duration.id,
    label: duration.label,
    seconds: duration.seconds,
    active: duration.active,
    order: duration.order,
    createdAt: duration.createdAt.toISOString(),
    updatedAt: duration.updatedAt.toISOString(),
  };
}

router.get("/", requireAuth, async (_req, res): Promise<void> => {
  const durations = await prisma.productDuration.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { seconds: "asc" }, { label: "asc" }],
  });
  res.json(durations.map(formatDuration));
});

router.post("/", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = durationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const label = normalizeDurationLabel(parsed.data.label, parsed.data.seconds);
  if (!label) {
    res.status(400).json({ error: "Duration label is required" });
    return;
  }

  const existing = await prisma.productDuration.findFirst({
    where: { label: { equals: label, mode: "insensitive" } },
  });
  if (existing) {
    res.status(200).json(formatDuration(existing));
    return;
  }

  const duration = await prisma.productDuration.create({
    data: {
      label,
      seconds: inferSeconds(label, parsed.data.seconds),
      active: parsed.data.active ?? true,
      order: parsed.data.order ?? 0,
    },
  });
  res.status(201).json(formatDuration(duration));
});

export default router;
