/**
 * Vercel Serverless handler (source).
 *
 * This file is bundled at build time into `api/index.js` via esbuild,
 * producing a self-contained ESM output so Node doesn't need to resolve
 * any internal relative imports at runtime (which otherwise fail with
 * ERR_MODULE_NOT_FOUND because ESM requires explicit `.js` extensions).
 */

import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { createContext } from "./_core/context";
import { registerOAuthRoutes } from "./_core/oauth";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    ts: Date.now(),
    node: process.version,
    hasDb: Boolean(process.env.DATABASE_URL),
    hasJwt: Boolean(process.env.JWT_SECRET),
    hasOAuth: Boolean(process.env.OAUTH_SERVER_URL),
    hasResend: Boolean(process.env.RESEND_API_KEY),
  });
});

// Diagnostic endpoint — actually tries to run `SELECT 1` against the DB.
// Helpful for checking credentials / SSL without going through the whole
// register flow. Does NOT reveal the password; just reports the error.
app.get("/api/db-ping", async (_req: Request, res: Response) => {
  const started = Date.now();
  const diag: Record<string, unknown> = {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    databaseUrlLength: process.env.DATABASE_URL?.length ?? 0,
  };

  // Stage 1: Can we parse the URL?
  if (process.env.DATABASE_URL) {
    try {
      const u = new URL(process.env.DATABASE_URL);
      diag.parsedUrl = {
        protocol: u.protocol,
        host: u.hostname,
        port: u.port,
        database: u.pathname.replace(/^\//, ""),
        user: u.username,
        hasPassword: Boolean(u.password),
        passwordLength: u.password.length,
        sslMode: u.searchParams.get("ssl-mode"),
      };
    } catch (err: any) {
      diag.parseError = String(err?.message || err);
      res.status(500).json({ ok: false, stage: "parseUrl", elapsedMs: Date.now() - started, ...diag });
      return;
    }
  } else {
    res.status(500).json({
      ok: false,
      stage: "env",
      message: "DATABASE_URL not set. Check Vercel → Settings → Environment Variables → make sure it's assigned to Production AND redeploy.",
      elapsedMs: Date.now() - started,
      ...diag,
    });
    return;
  }

  // Stage 2: Can we get the drizzle client (this also triggers schema bootstrap)?
  let db;
  try {
    db = await getDb();
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      stage: "getDb",
      message: String(err?.message || err),
      code: err?.code,
      elapsedMs: Date.now() - started,
      ...diag,
    });
    return;
  }
  if (!db) {
    res.status(500).json({
      ok: false,
      stage: "getDb",
      message: "drizzle returned null — pool creation failed internally. Check Vercel logs for '[Database] Failed to connect' line.",
      elapsedMs: Date.now() - started,
      ...diag,
    });
    return;
  }

  // Stage 3: Actually run a query
  try {
    const result = await db.execute(sql`SELECT 1 AS ok`);
    res.json({
      ok: true,
      elapsedMs: Date.now() - started,
      result: Array.isArray(result) ? result[0] : result,
      ...diag,
    });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      stage: "query",
      code: err?.code,
      errno: err?.errno,
      sqlState: err?.sqlState,
      message: String(err?.sqlMessage || err?.message || err),
      elapsedMs: Date.now() - started,
      ...diag,
    });
  }
});

registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`[trpc] error on ${path ?? "?"}:`, error);
    },
  }),
);

app.all("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
    method: req.method,
    message: "No API route matched this path.",
  });
});

// Catch-all JSON error handler: guarantees we never return HTML error pages.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as { message?: string; stack?: string };
  console.error("[api] Unhandled error:", e?.message || err, e?.stack);
  if (res.headersSent) return;
  res.status(500).json({
    error: "ServerError",
    message: e?.message || "Internal server error",
  });
});

export default app;
