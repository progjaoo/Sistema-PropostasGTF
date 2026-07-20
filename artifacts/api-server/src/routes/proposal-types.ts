import { Router } from "express";
import { prisma } from "@workspace/db";
import { z } from "zod/v4";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { registerIdParamValidation } from "../lib/validation";

const router = Router();
registerIdParamValidation(router);

const proposalTypeBody = z.object({
  name: z.string().trim().min(2).max(120),
  active: z.boolean().optional(),
}).strict();
const proposalTypeListQuery = z.object({
  active: z.enum(["true", "false", "all"]).optional(),
  search: z.string().max(200).optional(),
}).strict();

function formatProposalType(type: {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: type.id,
    name: type.name,
    active: type.active,
    createdAt: type.createdAt.toISOString(),
    updatedAt: type.updatedAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const query = proposalTypeListQuery.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Filtros de tipos invalidos", fields: query.error.issues });
    return;
  }
  const { active, search } = query.data;
  const types = await prisma.proposalType.findMany({
    where: {
      ...(active !== undefined && active !== "all" ? { active: active === "true" } : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(types.map(formatProposalType));
});

router.post("/", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = proposalTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const name = parsed.data.name.trim();
  const existingType = await prisma.proposalType.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (existingType) {
    if (existingType.active) {
      res.status(409).json({ error: "Tipo de proposta ja cadastrado" });
      return;
    }

    const reactivatedType = await prisma.proposalType.update({
      where: { id: existingType.id },
      data: {
        name,
        active: parsed.data.active ?? true,
      },
    });
    res.status(200).json(formatProposalType(reactivatedType));
    return;
  }

  try {
    const type = await prisma.proposalType.create({
      data: {
        name,
        active: parsed.data.active ?? true,
      },
    });
    res.status(201).json(formatProposalType(type));
  } catch {
    res.status(409).json({ error: "Tipo de proposta ja cadastrado" });
  }
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = proposalTypeBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const type = await prisma.proposalType.update({
      where: { id: String(req.params["id"]) },
      data: parsed.data,
    });
    res.json(formatProposalType(type));
  } catch {
    res.status(404).json({ error: "Tipo de proposta nao encontrado" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  try {
    const type = await prisma.proposalType.update({
      where: { id: String(req.params["id"]) },
      data: { active: false },
    });
    res.json(formatProposalType(type));
  } catch {
    res.status(404).json({ error: "Tipo de proposta nao encontrado" });
  }
});

export default router;
