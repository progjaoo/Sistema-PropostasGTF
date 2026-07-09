import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma, type Prisma } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { CreateUserBody, UpdateUserBody, ResetUserPasswordBody } from "@workspace/api-zod";

const router = Router();

router.use(requireAuth, requireAdmin);

type UserRow = Prisma.UserGetPayload<object>;

function formatUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/", async (req, res): Promise<void> => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  res.json(users.map(formatUser));
});

router.post("/", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role ?? "COMERCIAL" },
  });
  res.status(201).json(formatUser(user));
});

router.patch("/:id", async (req, res): Promise<void> => {
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const user = await prisma.user.update({
      where: { id: String(req.params["id"]) },
      data: parsed.data,
    });
    res.json(formatUser(user));
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

router.delete("/:id", async (req, res): Promise<void> => {
  try {
    const user = await prisma.user.update({
      where: { id: String(req.params["id"]) },
      data: { active: false },
    });
    res.json(formatUser(user));
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

router.post("/:id/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetUserPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  try {
    await prisma.user.update({
      where: { id: String(req.params["id"]) },
      data: { passwordHash },
    });
    res.json({ message: "Password reset successfully" });
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

export default router;
