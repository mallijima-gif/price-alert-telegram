/**
 * Database helpers — standalone (no Manus dependency)
 */

import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { alerts, alertLogs, users } from "../drizzle/schema";
import type { InsertUser, InsertAlert, InsertAlertLog } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(users).values(user).onDuplicateKeyUpdate({ set: { lastSignedIn: new Date() } });
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, username)).limit(1);
  return result[0];
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function getAlertsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alerts).where(eq(alerts.userId, userId));
}

export async function getAllActiveAlerts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alerts).where(and(eq(alerts.active, 1), eq(alerts.fired, 0)));
}

export async function createAlert(data: Omit<InsertAlert, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(alerts).values({ ...data, fired: 0, active: 1 });
}

export async function updateAlert(
  id: number,
  userId: number,
  data: Partial<Pick<InsertAlert, "symbol" | "market" | "targetPrice" | "condition" | "active">>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(alerts).set(data).where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
}

export async function deleteAlert(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(alerts).where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
}

export async function deleteAlertById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(alerts).where(eq(alerts.id, id));
}

// ─── Alert Logs ───────────────────────────────────────────────────────────────

export async function createAlertLog(data: Omit<InsertAlertLog, "id" | "sentAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(alertLogs).values(data);
}

export async function getAlertLogsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alertLogs).where(eq(alertLogs.userId, userId));
}
