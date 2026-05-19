/**
 * tRPC routers — standalone version
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import {
  getAlertsByUserId,
  getAllActiveAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  getAlertLogsByUserId,
} from "./db";
import { fetchPrice } from "./priceService";
import { testTelegramConnection, isTelegramConfigured } from "./telegramService";
import { runPriceCheck } from "./alertCron";
import type { Request, Response } from "express";

export type TrpcContext = {
  req: Request;
  res: Response;
  user: { id: number; username: string } | null;
};

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });
const { router, procedure } = t;

const publicProcedure = procedure;
const protectedProcedure = procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
  }),

  alerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getAlertsByUserId(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          symbol: z.string().min(1).max(20),
          market: z.enum(["KR", "US", "COIN"]),
          targetPrice: z.string(),
          condition: z.enum(["above", "below"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createAlert({
          userId: ctx.user.id,
          symbol: input.symbol.toUpperCase(),
          market: input.market,
          targetPrice: input.targetPrice,
          condition: input.condition,
        });
        return { ok: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          symbol: z.string().min(1).max(20).optional(),
          market: z.enum(["KR", "US", "COIN"]).optional(),
          targetPrice: z.string().optional(),
          condition: z.enum(["above", "below"]).optional(),
          active: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateAlert(id, ctx.user.id, data);
        return { ok: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteAlert(input.id, ctx.user.id);
        return { ok: true };
      }),

    checkPrice: protectedProcedure
      .input(z.object({ symbol: z.string(), market: z.enum(["KR", "US", "COIN"]) }))
      .query(async ({ input }) => {
        return fetchPrice(input.symbol, input.market);
      }),
  }),

  logs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getAlertLogsByUserId(ctx.user.id);
    }),
  }),

  settings: router({
    telegramStatus: protectedProcedure.query(async () => {
      const configured = isTelegramConfigured();
      if (!configured) return { ok: false, error: "환경변수 미설정" };
      return testTelegramConnection();
    }),

    sendTestMessage: protectedProcedure.mutation(async () => {
      const result = await testTelegramConnection();
      return result;
    }),

    triggerCheck: protectedProcedure.mutation(async () => {
      return runPriceCheck();
    }),
  }),
});

export type AppRouter = typeof appRouter;
