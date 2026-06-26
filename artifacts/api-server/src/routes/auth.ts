import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, refreshTokensTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshExpiresAt } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
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
  await db.insert(refreshTokensTable).values({
    userId: user.id,
    token: refreshToken,
    expiresAt: getRefreshExpiresAt(),
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/refresh", async (req, res): Promise<void> => {
  const token = req.cookies?.["refreshToken"];
  if (!token) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }
  try {
    const payload = verifyRefreshToken(token);
    const [stored] = await db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.token, token),
          gt(refreshTokensTable.expiresAt, new Date())
        )
      );
    if (!stored) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
    if (!user || !user.active) {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }
    await db.delete(refreshTokensTable).where(eq(refreshTokensTable.token, token));
    const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({ userId: user.id, role: user.role });
    await db.insert(refreshTokensTable).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: getRefreshExpiresAt(),
    });
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.["refreshToken"];
  if (token) {
    await db.delete(refreshTokensTable).where(eq(refreshTokensTable.token, token));
  }
  res.clearCookie("refreshToken");
  res.status(204).send();
});

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
