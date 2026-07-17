import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma, type Prisma } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { z } from "zod/v4";

const router = Router();

router.use(requireAuth, requireAdmin);

const stationAccessBody = z.object({
  stationId: z.string().min(1),
  canCreateProposals: z.boolean().default(true),
  canViewCatalog: z.boolean().default(true),
  active: z.boolean().default(true),
});

const createUserBody = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["ADMIN", "COMERCIAL"]).default("COMERCIAL"),
  active: z.boolean().default(true),
  stationAccesses: z.array(stationAccessBody).default([]),
});

const updateUserBody = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(["ADMIN", "COMERCIAL"]).optional(),
  active: z.boolean().optional(),
  stationAccesses: z.array(stationAccessBody).optional(),
});

const resetPasswordBody = z.object({
  newPassword: z.string().min(8).max(128),
});

type UserWithAccesses = Prisma.UserGetPayload<{
  include: {
    stationAccesses: {
      include: { station: true };
    };
  };
}>;

const userInclude = {
  stationAccesses: {
    orderBy: { station: { name: "asc" as const } },
    include: { station: true },
  },
} satisfies Prisma.UserInclude;

function formatUser(user: UserWithAccesses) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    stationAccesses: user.stationAccesses.map((access) => ({
      id: access.id,
      stationId: access.stationId,
      stationName: access.station.name,
      canCreateProposals: access.canCreateProposals,
      canViewCatalog: access.canViewCatalog,
      active: access.active,
    })),
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeAccesses(accesses: z.infer<typeof stationAccessBody>[]) {
  const byStation = new Map<string, z.infer<typeof stationAccessBody>>();
  accesses.forEach((access) => byStation.set(access.stationId, access));
  return [...byStation.values()];
}

async function validateAccesses(
  role: "ADMIN" | "COMERCIAL",
  active: boolean,
  accesses: z.infer<typeof stationAccessBody>[],
) {
  const normalized = normalizeAccesses(accesses);
  if (role === "ADMIN") return { accesses: normalized };
  if (role === "COMERCIAL" && active && !normalized.some((access) => access.active && access.canCreateProposals)) {
    return { error: "Usuário comercial ativo precisa ter acesso para criar propostas em ao menos uma empresa" };
  }
  if (normalized.length > 0) {
    const stationCount = await prisma.station.count({
      where: { id: { in: normalized.map((access) => access.stationId) }, active: true },
    });
    if (stationCount !== normalized.length) {
      return { error: "Uma ou mais empresas selecionadas não existem ou estão inativas" };
    }
  }
  return { accesses: normalized };
}

async function assertAdminCanChange(userId: string, nextRole: "ADMIN" | "COMERCIAL", nextActive: boolean) {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, active: true } });
  if (!existing) return { error: "Usuário não encontrado", status: 404 };
  if (existing.role === "ADMIN" && existing.active && (nextRole !== "ADMIN" || !nextActive)) {
    const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (activeAdmins <= 1) {
      return { error: "O último administrador ativo não pode ser desativado ou rebaixado", status: 409 };
    }
  }
  return { existing };
}

router.get("/", async (_req, res): Promise<void> => {
  const users = await prisma.user.findMany({ include: userInclude, orderBy: { createdAt: "asc" } });
  res.json(users.map(formatUser));
});

router.get("/:id", async (req, res): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: String(req.params["id"]) },
    include: userInclude,
  });
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json(formatUser(user));
});

router.post("/", async (req, res): Promise<void> => {
  const parsed = createUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const validation = await validateAccesses(parsed.data.role, parsed.data.active, parsed.data.stationAccesses);
  if (validation.error) {
    res.status(400).json({ error: validation.error });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: normalizeEmail(parsed.data.email),
          passwordHash,
          role: parsed.data.role,
          active: parsed.data.active,
        },
      });
      if (validation.accesses?.length) {
        await tx.userStationAccess.createMany({
          data: validation.accesses.map((access) => ({ ...access, userId: created.id })),
        });
      }
      return tx.user.findUniqueOrThrow({ where: { id: created.id }, include: userInclude });
    });
    res.status(201).json(formatUser(user));
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      res.status(409).json({ error: "E-mail já cadastrado" });
      return;
    }
    throw error;
  }
});

router.patch("/:id", async (req, res): Promise<void> => {
  const parsed = updateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const id = String(req.params["id"]);
  const current = await prisma.user.findUnique({ where: { id }, include: userInclude });
  if (!current) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  const nextRole = parsed.data.role ?? current.role;
  const nextActive = parsed.data.active ?? current.active;
  if (id === req.userId && (nextRole !== "ADMIN" || !nextActive)) {
    res.status(409).json({ error: "Você não pode desativar ou rebaixar a própria conta" });
    return;
  }
  const adminCheck = await assertAdminCanChange(id, nextRole, nextActive);
  if (adminCheck.error) {
    res.status(adminCheck.status ?? 409).json({ error: adminCheck.error });
    return;
  }
  const currentAccesses = current.stationAccesses.map((access) => ({
    stationId: access.stationId,
    canCreateProposals: access.canCreateProposals,
    canViewCatalog: access.canViewCatalog,
    active: access.active,
  }));
  const validation = await validateAccesses(nextRole, nextActive, parsed.data.stationAccesses ?? currentAccesses);
  if (validation.error) {
    res.status(400).json({ error: validation.error });
    return;
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.email !== undefined ? { email: normalizeEmail(parsed.data.email) } : {}),
          ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
          ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        },
      });
      if (parsed.data.stationAccesses !== undefined) {
        await tx.userStationAccess.deleteMany({ where: { userId: id } });
        if (validation.accesses?.length) {
          await tx.userStationAccess.createMany({
            data: validation.accesses.map((access) => ({ ...access, userId: id })),
          });
        }
      }
      if (!nextActive) {
        await tx.refreshToken.deleteMany({ where: { userId: id } });
      }
      return tx.user.findUniqueOrThrow({ where: { id }, include: userInclude });
    });
    res.json(formatUser(user));
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      res.status(409).json({ error: "E-mail já cadastrado" });
      return;
    }
    throw error;
  }
});

router.delete("/:id", async (req, res): Promise<void> => {
  const id = String(req.params["id"]);
  if (id === req.userId) {
    res.status(409).json({ error: "Você não pode desativar a própria conta" });
    return;
  }
  const current = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true } });
  if (!current) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  const adminCheck = await assertAdminCanChange(id, current.role, false);
  if (adminCheck.error) {
    res.status(adminCheck.status ?? 409).json({ error: adminCheck.error });
    return;
  }
  const user = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.deleteMany({ where: { userId: id } });
    return tx.user.update({ where: { id }, data: { active: false }, include: userInclude });
  });
  res.json(formatUser(user));
});

router.post("/:id/reset-password", async (req, res): Promise<void> => {
  const parsed = resetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const id = String(req.params["id"]);
  const exists = await prisma.user.count({ where: { id } });
  if (!exists) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { passwordHash } }),
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
  ]);
  res.json({ message: "Senha redefinida com sucesso" });
});

export default router;
