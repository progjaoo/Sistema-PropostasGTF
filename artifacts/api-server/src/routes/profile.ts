import { Router } from "express";
import { z } from "zod/v4";
import { prisma } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { optionalImageDataUrlSchema } from "../lib/validation";

const router = Router();

const profileBody = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  jobTitle: z.string().trim().max(120).optional().nullable(),
  contactPhone: z.string().trim().max(50).optional().nullable(),
  contactEmail: z.union([z.string().trim().email().max(254), z.literal(""), z.null()]).optional(),
  avatarBase64: optionalImageDataUrlSchema.optional().nullable(),
}).strict();

function emptyToNull(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatProfile(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  jobTitle: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  avatarBase64: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    jobTitle: user.jobTitle ?? null,
    contactPhone: user.contactPhone ?? null,
    contactEmail: user.contactEmail ?? null,
    avatarBase64: user.avatarBase64 ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatProfile(user));
});

router.patch("/", requireAuth, async (req, res): Promise<void> => {
  const parsed = profileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.jobTitle !== undefined ? { jobTitle: emptyToNull(data.jobTitle) } : {}),
      ...(data.contactPhone !== undefined ? { contactPhone: emptyToNull(data.contactPhone) } : {}),
      ...(data.contactEmail !== undefined ? { contactEmail: emptyToNull(data.contactEmail) } : {}),
      ...(data.avatarBase64 !== undefined ? { avatarBase64: emptyToNull(data.avatarBase64) } : {}),
    },
  });

  res.json(formatProfile(user));
});

export default router;
