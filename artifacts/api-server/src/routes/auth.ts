import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@workspace/db";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";
import { sendPasswordResetEmail } from "../services/password-reset-email";
import { securityConfig } from "../config/security";
import {
  createSession,
  revokeSession,
  rotateSession,
} from "../services/security/session-service";
import { consumeSecurityLimit } from "../services/security/rate-limit-service";

const router = Router();
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RESET_PUBLIC_MESSAGE = "Se o e-mail estiver cadastrado, enviaremos as instrucoes de recuperacao.";
const PASSWORD_RESET_INVALID_MESSAGE = "Link de recuperacao invalido, expirado ou ja utilizado.";
const dummyPasswordHashPromise = bcrypt.hash("invalid-account", 12);
const refreshCookieName = securityConfig.isProduction
  ? "__Host-gtf_refresh"
  : "gtf_refresh";
const legacyRefreshCookieName = "refreshToken";
const loginBody = LoginBody.strict();

const registerCommercialBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(128),
}).strict();

const forgotPasswordBody = z.object({
  email: z.string().email(),
}).strict();

const resetPasswordBody = z.object({
  token: z.string().min(20).max(256),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(128),
  confirmPassword: z.string().min(PASSWORD_MIN_LENGTH).max(128),
}).strict().refine((value) => value.newPassword === value.confirmPassword, {
  message: "As senhas nao conferem",
  path: ["confirmPassword"],
});

const mobileRefreshBody = z.object({
  refreshToken: z.string().min(20).max(256),
}).strict();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
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

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: securityConfig.isProduction,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(refreshCookieName, token, refreshCookieOptions());
}

function clearRefreshCookies(res: Response) {
  const options = refreshCookieOptions();
  res.clearCookie(refreshCookieName, options);
  res.clearCookie(legacyRefreshCookieName, {
    httpOnly: true,
    secure: securityConfig.isProduction,
    sameSite: "lax",
    path: "/",
  });
}

function readWebRefreshToken(req: Request): string | undefined {
  return req.cookies?.[refreshCookieName] ?? req.cookies?.[legacyRefreshCookieName];
}

function requestIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

async function respondWhenLimited(
  res: Response,
  scope: string,
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const result = await consumeSecurityLimit(scope, key, { max, windowMs });
  if (result.allowed) return false;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
  );
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({ error: "Muitas solicitacoes. Tente novamente mais tarde." });
  return true;
}

router.post("/login", async (req, res): Promise<void> => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { password } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  const comparisonHash = user?.passwordHash ?? await dummyPasswordHashPromise;
  const valid = await bcrypt.compare(password, comparisonHash);
  if (!user || !user.active || !valid) {
    const limited = await respondWhenLimited(
      res,
      "login-failure",
      `${requestIp(req)}:${email}`,
      5,
      15 * 60 * 1000,
    );
    if (limited) return;
    res.status(401).json({ error: "Credenciais invalidas" });
    return;
  }
  const { accessToken, refreshToken } = await createSession(user);
  setRefreshCookie(res, refreshToken);
  res.json({
    accessToken,
    user: formatAuthUser(user),
  });
});

router.post("/register-commercial", async (req, res): Promise<void> => {
  if (!securityConfig.publicCommercialRegistrationEnabled) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (await respondWhenLimited(
    res,
    "public-commercial-registration",
    requestIp(req),
    3,
    60 * 60 * 1000,
  )) return;

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
  if (await respondWhenLimited(
    res,
    "forgot-password",
    `${requestIp(req)}:${email}`,
    5,
    60 * 60 * 1000,
  )) return;

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
  const parsed = resetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (await respondWhenLimited(
    res,
    "reset-password",
    `${requestIp(req)}:${sha256(parsed.data.token)}`,
    10,
    15 * 60 * 1000,
  )) return;

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
    await tx.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    return { ok: true as const };
  });

  if (!result.ok) {
    res.status(400).json({ error: PASSWORD_RESET_INVALID_MESSAGE });
    return;
  }

  res.json({ message: "Senha redefinida com sucesso" });
});

router.post("/refresh", async (req, res): Promise<void> => {
  const token = readWebRefreshToken(req);
  if (!token) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }
  try {
    const rotated = await rotateSession(token);
    setRefreshCookie(res, rotated.refreshToken);
    res.json({
      accessToken: rotated.accessToken,
      user: formatAuthUser(rotated.user),
    });
  } catch {
    await respondWhenLimited(
      res,
      "invalid-web-refresh",
      `${requestIp(req)}:${sha256(token)}`,
      20,
      15 * 60 * 1000,
    );
    if (res.headersSent) return;
    clearRefreshCookies(res);
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/mobile/login", async (req, res): Promise<void> => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { password } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  const comparisonHash = user?.passwordHash ?? await dummyPasswordHashPromise;
  const valid = await bcrypt.compare(password, comparisonHash);
  if (!user || !user.active || !valid) {
    const limited = await respondWhenLimited(
      res,
      "mobile-login-failure",
      `${requestIp(req)}:${email}`,
      5,
      15 * 60 * 1000,
    );
    if (limited) return;
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
  const parsed = mobileRefreshBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const rotated = await rotateSession(parsed.data.refreshToken);
    res.json({
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      user: formatAuthUser(rotated.user),
    });
  } catch {
    await respondWhenLimited(
      res,
      "invalid-mobile-refresh",
      `${requestIp(req)}:${sha256(parsed.data.refreshToken)}`,
      20,
      15 * 60 * 1000,
    );
    if (res.headersSent) return;
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/mobile/logout", async (req, res): Promise<void> => {
  const parsed = mobileRefreshBody.safeParse(req.body);
  if (parsed.success) {
    await revokeSession(parsed.data.refreshToken);
  }
  res.status(204).send();
});

router.post("/logout", async (req, res): Promise<void> => {
  const token = readWebRefreshToken(req);
  if (token) {
    await revokeSession(token);
  }
  clearRefreshCookies(res);
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
