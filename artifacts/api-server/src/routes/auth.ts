import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@workspace/db";
import { z } from "zod/v4";
import { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshExpiresAt } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";
import { sendPasswordResetEmail } from "../services/password-reset-email";

const router = Router();
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RESET_PUBLIC_MESSAGE = "Se o e-mail estiver cadastrado, enviaremos as instrucoes de recuperacao.";
const PASSWORD_RESET_INVALID_MESSAGE = "Link de recuperacao invalido, expirado ou ja utilizado.";
const forgotPasswordRateWindowMs = 60 * 60 * 1000;
const forgotPasswordRateMax = 5;
const resetPasswordRateWindowMs = 15 * 60 * 1000;
const resetPasswordRateMax = 10;
const forgotPasswordAttempts = new Map<string, { count: number; resetAt: number }>();
const resetPasswordAttempts = new Map<string, { count: number; resetAt: number }>();

const registerCommercialBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(128),
});

const forgotPasswordBody = z.object({
  email: z.string().email(),
});

const resetPasswordBody = z.object({
  token: z.string().min(20).max(256),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(128),
  confirmPassword: z.string().min(PASSWORD_MIN_LENGTH).max(128),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: "As senhas nao conferem",
  path: ["confirmPassword"],
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function makeRateLimitKey(prefix: string, value: string) {
  return `${prefix}:${sha256(value).slice(0, 32)}`;
}

function consumeRateLimit(store: Map<string, { count: number; resetAt: number }>, key: string, max: number, windowMs: number) {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}

function getPasswordResetTtlMinutes() {
  const raw = Number(process.env["PASSWORD_RESET_TTL_MINUTES"] ?? "30");
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
}

function buildResetUrl(token: string, clientPlatform?: string) {
  if (clientPlatform === "mobile") {
    const rawMobileUrl = process.env["MOBILE_APP_RESET_URL"] || "gtfpropostas://reset-password";
    const mobileUrl = rawMobileUrl.replace(/\/$/, "");
    return `${mobileUrl}?token=${encodeURIComponent(token)}`;
  }
  const rawBaseUrl = process.env["APP_PUBLIC_URL"] || "http://localhost:21709";
  const baseUrl = rawBaseUrl.replace(/\/$/, "");
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

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

async function createSession(user: {
  id: string;
  role: string;
}) {
  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshExpiresAt(),
    },
  });
  return { accessToken, refreshToken };
}

router.post("/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { password } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
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
  const { accessToken, refreshToken } = await createSession(user);
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

  const email = normalizeEmail(parsed.data.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "E-mail ja cadastrado" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: "COMERCIAL",
      active: false,
    },
  });

  res.status(201).json(formatAuthUser(user));
});

router.post("/forgot-password", async (req, res): Promise<void> => {
  const parsed = forgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = normalizeEmail(parsed.data.email);
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const emailKey = makeRateLimitKey("forgot-email", email);
  const ipKey = makeRateLimitKey("forgot-ip", ip);
  const allowedByEmail = consumeRateLimit(forgotPasswordAttempts, emailKey, forgotPasswordRateMax, forgotPasswordRateWindowMs);
  const allowedByIp = consumeRateLimit(forgotPasswordAttempts, ipKey, forgotPasswordRateMax * 5, forgotPasswordRateWindowMs);
  if (!allowedByEmail || !allowedByIp) {
    res.status(429).json({ error: "Muitas solicitacoes. Tente novamente mais tarde." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.active) {
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = sha256(token);
    const ttlMinutes = getPasswordResetTtlMinutes();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    try {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl: buildResetUrl(token, req.header("x-client-platform")),
        ttlMinutes,
      });
    } catch (error) {
      req.log?.error({ err: error, userId: user.id }, "Failed to send password reset email");
    }
  }

  res.status(202).json({ message: PASSWORD_RESET_PUBLIC_MESSAGE });
});

router.post("/reset-password", async (req, res): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const ipKey = makeRateLimitKey("reset-ip", ip);
  if (!consumeRateLimit(resetPasswordAttempts, ipKey, resetPasswordRateMax, resetPasswordRateWindowMs)) {
    res.status(429).json({ error: "Muitas tentativas. Tente novamente mais tarde." });
    return;
  }

  const parsed = resetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tokenHash = sha256(parsed.data.token);
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const resetToken = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
      return { ok: false as const };
    }
    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
    });
    await tx.refreshToken.deleteMany({ where: { userId: resetToken.userId } });
    return { ok: true as const };
  });

  if (!result.ok) {
    res.status(400).json({ error: PASSWORD_RESET_INVALID_MESSAGE });
    return;
  }

  res.json({ message: "Senha redefinida com sucesso" });
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

router.post("/mobile/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { password } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
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

  const { accessToken, refreshToken } = await createSession(user);
  res.json({
    accessToken,
    refreshToken,
    user: formatAuthUser(user),
  });
});

router.post("/mobile/refresh", async (req, res): Promise<void> => {
  const refreshToken = req.body?.refreshToken;
  if (!refreshToken || typeof refreshToken !== "string") {
    res.status(400).json({ error: "refreshToken is required" });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const stored = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: payload.userId,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!stored) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    if (!stored.user.active) {
      await prisma.refreshToken.deleteMany({ where: { userId: stored.userId } });
      res.status(401).json({ error: "Conta inativa" });
      return;
    }

    const newAccessToken = signAccessToken({ userId: stored.user.id, role: stored.user.role });
    const newRefreshToken = signRefreshToken({ userId: stored.user.id, role: stored.user.role });
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: stored.id } }),
      prisma.refreshToken.create({
        data: {
          userId: stored.user.id,
          token: newRefreshToken,
          expiresAt: getRefreshExpiresAt(),
        },
      }),
    ]);
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: formatAuthUser(stored.user),
    });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/mobile/logout", async (req, res): Promise<void> => {
  const refreshToken = req.body?.refreshToken;
  if (refreshToken && typeof refreshToken === "string") {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.status(204).send();
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
