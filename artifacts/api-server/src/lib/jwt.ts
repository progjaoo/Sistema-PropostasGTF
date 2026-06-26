import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env["JWT_SECRET"] ?? "dev_jwt_secret_change_me";
const REFRESH_SECRET = process.env["JWT_REFRESH_SECRET"] ?? "dev_refresh_secret_change_me";
const ACCESS_EXPIRES = process.env["JWT_EXPIRES_IN"] ?? "15m";
const REFRESH_EXPIRES = process.env["JWT_REFRESH_EXPIRES_IN"] ?? "7d";

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

export function getRefreshExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}
