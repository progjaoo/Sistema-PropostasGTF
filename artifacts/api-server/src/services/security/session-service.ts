import crypto from "node:crypto";
import { prisma } from "@workspace/db";
import { securityConfig } from "../../config/security";
import { signAccessToken } from "../../lib/jwt";

const DEFAULT_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthPrincipal {
  userId: string;
  role: "ADMIN" | "COMERCIAL";
}

export class InvalidSessionError extends Error {}
export class SessionReplayError extends Error {}

function parseDurationMs(value: string): number {
  const match = /^(\d+)(m|h|d)$/.exec(value.trim());
  if (!match) return DEFAULT_REFRESH_TTL_MS;
  const amount = Number(match[1]);
  const multiplier = match[2] === "m"
    ? 60 * 1000
    : match[2] === "h"
      ? 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;
  return amount * multiplier;
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function refreshExpiresAt(): Date {
  return new Date(
    Date.now() + parseDurationMs(securityConfig.refreshTokenTtl),
  );
}

export async function createSession(user: {
  id: string;
  role: string;
}) {
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      familyId: crypto.randomUUID(),
      userId: user.id,
      expiresAt: refreshExpiresAt(),
    },
  });

  return {
    accessToken: signAccessToken({ userId: user.id, role: user.role }),
    refreshToken,
  };
}

export async function rotateSession(refreshToken: string) {
  const now = new Date();
  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: {
      OR: [{ tokenHash }, { token: refreshToken }],
    },
    include: { user: true },
  });

  if (!stored) throw new InvalidSessionError("Invalid refresh token");

  const familyId = stored.familyId ?? crypto.randomUUID();
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: now },
    });
    throw new SessionReplayError("Refresh token replay detected");
  }

  if (stored.expiresAt <= now || !stored.user.active) {
    await revokeAllUserSessions(stored.userId);
    throw new InvalidSessionError("Session expired or user inactive");
  }

  const nextRefreshToken = generateRefreshToken();
  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: now, lastUsedAt: now, familyId },
      });
      if (claimed.count !== 1) {
        throw new SessionReplayError("Refresh token already rotated");
      }

      await tx.refreshToken.create({
        data: {
          tokenHash: hashRefreshToken(nextRefreshToken),
          familyId,
          userId: stored.userId,
          expiresAt: refreshExpiresAt(),
        },
      });
    });
  } catch (error) {
    if (error instanceof SessionReplayError) {
      await prisma.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: now },
      });
    }
    throw error;
  }

  return {
    accessToken: signAccessToken({
      userId: stored.user.id,
      role: stored.user.role,
    }),
    refreshToken: nextRefreshToken,
    user: stored.user,
  };
}

export async function revokeSession(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: {
      OR: [{ tokenHash }, { token: refreshToken }],
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentPrincipal(
  userId: string,
): Promise<AuthPrincipal | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true },
  });
  if (!user?.active) return null;
  return { userId: user.id, role: user.role };
}
