import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, TrpcContext } from "./routers";
import { registerAuthRoutes, verifySessionToken, COOKIE_NAME } from "./auth";
import { startCron } from "./alertCron";
import type { Request, Response } from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Auth routes (login / logout / me)
  registerAuthRoutes(app);

  // tRPC
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: async ({ req, res }: { req: Request; res: Response }): Promise<TrpcContext> => {
        const token = (req as any).cookies?.[COOKIE_NAME];
        let user: TrpcContext["user"] = null;
        if (token) {
          const session = await verifySessionToken(token);
          if (session) user = { id: session.userId, username: session.username };
        }
        return { req, res, user };
      },
    })
  );

  // Serve built frontend in production
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(__dirname, "../client/dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start cron
  startCron();

  const port = parseInt(process.env.PORT ?? "3000");
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
