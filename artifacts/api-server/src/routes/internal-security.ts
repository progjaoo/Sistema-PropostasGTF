import crypto from "node:crypto";
import { Router } from "express";
import { deleteExpiredSecurityLimits } from "../services/security/rate-limit-service";

const router = Router();

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

router.get("/cleanup", async (req, res): Promise<void> => {
  const cronSecret = process.env["CRON_SECRET"];
  if (!cronSecret || cronSecret.length < 32) {
    res.status(404).json({ error: "Rota nao encontrada" });
    return;
  }

  const authorization = req.get("authorization") ?? "";
  const suppliedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!constantTimeEqual(suppliedSecret, cronSecret)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const deleted = await deleteExpiredSecurityLimits();
  res.json({ deleted });
});

export default router;
