import type { NextFunction, Request, Response } from "express";
import type { CorsOptions } from "cors";
import { securityConfig } from "../config/security";
import { consumeSecurityLimit } from "../services/security/rate-limit-service";

const allowedOrigins = new Set(securityConfig.allowedOrigins);
const COOKIE_AUTH_PATHS = new Set([
  "/api/auth/refresh",
  "/api/auth/logout",
]);

function originFromReferer(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowedOrigins.has(origin) ? origin : false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "X-Client-Platform",
    "X-Client-Version",
    "X-Auth-Retry",
  ],
  exposedHeaders: ["X-Request-Id"],
  maxAge: 600,
  optionsSuccessStatus: 204,
};

export function requireTrustedWebOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!COOKIE_AUTH_PATHS.has(req.path) || req.method !== "POST") {
    next();
    return;
  }

  const origin = req.get("origin") ?? originFromReferer(req.get("referer"));
  if (!origin || !allowedOrigins.has(origin)) {
    res.status(403).json({ error: "Request origin is not allowed" });
    return;
  }

  next();
}

export function apiSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (req.id) res.setHeader("X-Request-Id", String(req.id));
  next();
}

export async function globalApiRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.path === "/api/healthz") {
    next();
    return;
  }

  try {
    const result = await consumeSecurityLimit(
      "api-global",
      req.ip || req.socket.remoteAddress || "unknown",
      { max: 300, windowMs: 15 * 60 * 1000 },
    );
    if (!result.allowed) {
      res.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))),
      );
      res.status(429).json({ error: "Muitas solicitacoes. Tente novamente mais tarde." });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}
