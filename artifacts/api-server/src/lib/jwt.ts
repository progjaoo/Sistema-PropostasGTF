import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { securityConfig } from "../config/security";

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(
    { role: payload.role },
    securityConfig.accessTokenSecret,
    {
      algorithm: "HS256",
      subject: payload.userId,
      issuer: "gtf-propostas",
      audience: "gtf-propostas-api",
      jwtid: crypto.randomUUID(),
      expiresIn: securityConfig.accessTokenTtl,
    } as jwt.SignOptions,
  );
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(
    { role: payload.role },
    securityConfig.refreshTokenSecret,
    {
      algorithm: "HS256",
      subject: payload.userId,
      issuer: "gtf-propostas",
      audience: "gtf-propostas-api",
      jwtid: crypto.randomUUID(),
      expiresIn: securityConfig.refreshTokenTtl,
    } as jwt.SignOptions,
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  const payload = jwt.verify(token, securityConfig.accessTokenSecret, {
    algorithms: ["HS256"],
    issuer: "gtf-propostas",
    audience: "gtf-propostas-api",
  });
  if (typeof payload === "string" || !payload.sub || typeof payload.role !== "string") {
    throw new Error("Invalid access token claims");
  }
  return { userId: payload.sub, role: payload.role };
}

export function verifyRefreshToken(token: string): JwtPayload {
  const payload = jwt.verify(token, securityConfig.refreshTokenSecret, {
    algorithms: ["HS256"],
    issuer: "gtf-propostas",
    audience: "gtf-propostas-api",
  });
  if (typeof payload === "string" || !payload.sub || typeof payload.role !== "string") {
    throw new Error("Invalid refresh token claims");
  }
  return { userId: payload.sub, role: payload.role };
}

export function getRefreshExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}
