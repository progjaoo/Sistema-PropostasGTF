import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { getCurrentPrincipal } from "../services/security/session-service";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: "ADMIN" | "COMERCIAL";
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const principal = await getCurrentPrincipal(payload.userId);
    if (!principal) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }
    req.userId = principal.userId;
    req.userRole = principal.role;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== "ADMIN") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
