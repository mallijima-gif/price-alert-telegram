import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

export const alerts = mysqlTable(
  "alerts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    symbol: varchar("symbol", { length: 64 }).notNull(),
    market: mysqlEnum("market", ["KR", "US", "COIN"]).notNull(),
    targetPrice: varchar("targetPrice", { length: 32 }).notNull(),
    condition: mysqlEnum("condition", ["above", "below"]).notNull(),
    fired: int("fired").default(0).notNull(),
    active: int("active").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("alerts_user_idx").on(table.userId),
    index("alerts_active_fired_idx").on(table.active, table.fired),
    index("alerts_market_symbol_idx").on(table.market, table.symbol),
  ]
);

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

export const alertLogs = mysqlTable(
  "alert_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    alertId: int("alertId").notNull(),
    userId: int("userId").notNull(),
    symbol: varchar("symbol", { length: 64 }).notNull(),
    market: varchar("market", { length: 16 }).notNull(),
    targetPrice: varchar("targetPrice", { length: 32 }).notNull(),
    triggeredPrice: varchar("triggeredPrice", { length: 32 }).notNull(),
    condition: varchar("condition", { length: 16 }).notNull(),
    sentAt: timestamp("sentAt").defaultNow().notNull(),
  },
  (table) => [
    index("alert_logs_user_idx").on(table.userId),
    index("alert_logs_user_sent_at_idx").on(table.userId, table.sentAt),
  ]
);

export type AlertLog = typeof alertLogs.$inferSelect;
export type InsertAlertLog = typeof alertLogs.$inferInsert;
