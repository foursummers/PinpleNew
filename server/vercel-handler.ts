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
import { getDb, buildDbConfig } from "./db";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import { getBootstrapStatements } from "./_core/bootstrap-sql";

const app = express();

// Trust Vercel's edge proxy so req.protocol / req.secure / req.ip reflect
// the real client-facing scheme (https) rather than the internal http hop.
// This is critical for session cookies: without it, isSecureRequest() may
// return false and cookies with `secure: true` get rejected by the browser.
app.set("trust proxy", true);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    ok: true,
    ts: Date.now(),
    node: process.version,
    hasDb: Boolean(process.env.DATABASE_URL),
    hasJwt: Boolean(process.env.JWT_SECRET),
    hasOAuth: Boolean(process.env.OAUTH_SERVER_URL),
    hasResend: Boolean(process.env.RESEND_API_KEY),
    // Surface what the request looks like to the server so we can verify
    // trust-proxy is working and session cookies will be accepted.
    request: {
      protocol: req.protocol,
      secure: req.secure,
      xForwardedProto: req.headers["x-forwarded-proto"] ?? null,
      hasCookieHeader: Boolean(req.headers.cookie),
      cookieHeaderLength: (req.headers.cookie ?? "").length,
    },
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

// Diagnostic: list actual columns on `users` so we can see whether the
// self-healing ALTER TABLE steps actually applied on this DB.
app.get("/api/db-columns", async (_req: Request, res: Response) => {
  if (!process.env.DATABASE_URL) {
    res.status(500).json({ ok: false, message: "DATABASE_URL not set" });
    return;
  }
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(buildDbConfig(process.env.DATABASE_URL));
    const [rows] = await conn.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT " +
        "FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' " +
        "ORDER BY ORDINAL_POSITION",
    );
    const [tables] = await conn.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME",
    );
    res.json({ ok: true, usersColumns: rows, tables });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      code: err?.code,
      sqlState: err?.sqlState,
      message: String(err?.sqlMessage || err?.message || err),
    });
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
        /* ignore */
      }
    }
  }
});

// Diagnostic: force-run every bootstrap/ALTER statement against the DB and
// report which ones applied vs. failed. Protected by DB_REPAIR_SECRET so
// random visitors can't hit it. If DB_REPAIR_SECRET is unset, allow anyway
// (caller deliberately exposed it for recovery).
app.get("/api/db-repair", async (req: Request, res: Response) => {
  const required = process.env.DB_REPAIR_SECRET;
  const given = (req.query.secret as string) || req.headers["x-repair-secret"];
  if (required && given !== required) {
    res.status(401).json({ ok: false, message: "Unauthorized" });
    return;
  }
  if (!process.env.DATABASE_URL) {
    res.status(500).json({ ok: false, message: "DATABASE_URL not set" });
    return;
  }
  const statements = getBootstrapStatements();
  const results: Array<{
    preview: string;
    status: "applied" | "skipped" | "failed";
    message?: string;
    code?: string;
  }> = [];
  let applied = 0;
  let skipped = 0;
  let failed = 0;
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(buildDbConfig(process.env.DATABASE_URL));
    for (const stmt of statements) {
      const preview = stmt.replace(/\s+/g, " ").slice(0, 120);
      try {
        await conn.query(stmt);
        applied++;
        results.push({ preview, status: "applied" });
      } catch (err: any) {
        const msg = String(err?.sqlMessage || err?.message || err);
        if (
          /Duplicate column|Duplicate key|already exists|ER_DUP_FIELDNAME|ER_TABLE_EXISTS_ERROR|ER_DUP_KEYNAME/i.test(
            msg,
          )
        ) {
          skipped++;
          results.push({ preview, status: "skipped", message: msg, code: err?.code });
        } else {
          failed++;
          results.push({ preview, status: "failed", message: msg, code: err?.code });
        }
      }
    }
    res.json({ ok: failed === 0, applied, skipped, failed, total: statements.length, results });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      code: err?.code,
      sqlState: err?.sqlState,
      message: String(err?.sqlMessage || err?.message || err),
      applied,
      skipped,
      failed,
      results,
    });
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
        /* ignore */
      }
    }
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
