/**
 * Simple JWT-based auth — standalone (no Manus OAuth)
 * Login: POST /api/auth/login  { username, password }
 * Session stored in httpOnly cookie "app_session"
 */

import { Router, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-in-production-secret"
);
const COOKIE_NAME = "app_session";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme";

export { COOKIE_NAME };

export async function createSessionToken(userId: number, username: string): Promise<string> {
  return new SignJWT({ userId, username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: number; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.userId as number, username: payload.username as string };
  } catch {
    return null;
  }
}

export function registerAuthRoutes(app: import("express").Express): void {
  const router = Router();

  // POST /api/auth/login
  router.post("/login", async (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." });
    }

    // Upsert admin user in DB
    const db = await getDb();
    let userId = 1;
    if (db) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.openId, username))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(users).values({
          openId: username,
          name: username,
          role: "admin",
          lastSignedIn: new Date(),
        });
        const inserted = await db
          .select()
          .from(users)
          .where(eq(users.openId, username))
          .limit(1);
        userId = inserted[0]?.id ?? 1;
      } else {
        userId = existing[0]!.id;
        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
      }
    }

    const token = await createSessionToken(userId, username);
    const isSecure = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    return res.json({ ok: true, userId, username });
  });

  // POST /api/auth/logout
  router.post("/logout", (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return res.json({ ok: true });
  });

  // GET /api/auth/me
  router.get("/me", async (req: Request, res: Response) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.json(null);
    const session = await verifySessionToken(token);
    if (!session) return res.json(null);
    return res.json({ id: session.userId, username: session.username });
  });

  app.use("/api/auth", router);
}
