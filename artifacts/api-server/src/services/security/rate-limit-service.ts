import crypto from "node:crypto";
import { prisma } from "@workspace/db";
import { securityConfig } from "../../config/security";

export interface SecurityRateLimitPolicy {
  max: number;
  windowMs: number;
}

export async function consumeSecurityLimit(
  scope: string,
  key: string,
  policy: SecurityRateLimitPolicy,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = Date.now();
  const windowStartMs = Math.floor(now / policy.windowMs) * policy.windowMs;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + policy.windowMs);
  const keyHash = crypto
    .createHmac("sha256", securityConfig.rateLimitHmacSecret)
    .update(key)
    .digest("hex");

  const counter = await prisma.securityRateLimit.upsert({
    where: {
      scope_keyHash_windowStart: {
        scope,
        keyHash,
        windowStart,
      },
    },
    update: {
      count: { increment: 1 },
      expiresAt,
    },
    create: {
      scope,
      keyHash,
      windowStart,
      count: 1,
      expiresAt,
    },
  });

  return {
    allowed: counter.count <= policy.max,
    remaining: Math.max(0, policy.max - counter.count),
    resetAt: expiresAt,
  };
}

export async function deleteExpiredSecurityLimits(
  now = new Date(),
): Promise<number> {
  const result = await prisma.securityRateLimit.deleteMany({
    where: { expiresAt: { lte: now } },
  });
  return result.count;
}
