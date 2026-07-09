import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "@workspace/db";
import { z } from "zod/v4";
import { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshExpiresAt } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

const registerCommercialBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

function formatAuthUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  jobTitle?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  avatarBase64?: string | null;
  createdAt: Date;
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
  };
}

router.post("/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    res.status(401).json({ error: "Credenciais invalidas ou conta inativa" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Credenciais invalidas" });
    return;
  }
  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshExpiresAt(),
    },
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({
    accessToken,
    user: formatAuthUser(user),
  });
});

router.post("/register-commercial", async (req, res): Promise<void> => {
  const parsed = registerCommercialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    res.status(409).json({ error: "E-mail ja cadastrado" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "COMERCIAL",
      active: true,
    },
  });

  res.status(201).json(formatAuthUser(user));
});

router.post("/refresh", async (req, res): Promise<void> => {
  const token = req.cookies?.["refreshToken"];
  if (!token) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }
  try {
    const payload = verifyRefreshToken(token);
    const stored = await prisma.refreshToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.active) {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }
    await prisma.refreshToken.delete({ where: { token } });
    const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({ userId: user.id, role: user.role });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: getRefreshExpiresAt(),
      },
    });
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({
      accessToken: newAccessToken,
      user: formatAuthUser(user),
    });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.["refreshToken"];
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
  res.clearCookie("refreshToken");
  res.status(204).send();
});

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatAuthUser(user));
});

export default router;
