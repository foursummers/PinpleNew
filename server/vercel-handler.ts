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

  // Stage 2: Try a DIRECT mysql2 connection + SELECT 1. This bypasses drizzle
  // so we can see the real driver-level error (auth failure, SSL handshake,
  // network reset, etc.) rather than drizzle's generic "Failed query" wrap.
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(buildDbConfig(process.env.DATABASE_URL));
  } catch (err: any) {
    const cause = (err as any)?.cause;
    res.status(500).json({
      ok: false,
      stage: "connect",
      code: err?.code,
      errno: err?.errno,
      sqlState: err?.sqlState,
      message: String(err?.sqlMessage || err?.message || err),
      cause: cause
        ? {
            code: cause.code,
            errno: cause.errno,
            message: String(cause.sqlMessage || cause.message || cause),
          }
        : undefined,
      elapsedMs: Date.now() - started,
      ...diag,
    });
    return;
  }

  // Stage 3: Run SELECT 1 + a quick columns check on `users`
  try {
    const [rows] = await conn.query("SELECT 1 AS ok");
    let usersColumns: unknown = null;
    let tables: unknown = null;
    try {
      const [colRows] = await conn.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' ORDER BY ORDINAL_POSITION",
      );
      usersColumns = colRows;
      const [tblRows] = await conn.query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME",
      );
      tables = tblRows;
    } catch {
      /* optional */
    }
    res.json({
      ok: true,
      elapsedMs: Date.now() - started,
      result: Array.isArray(rows) ? rows[0] : rows,
      usersColumns,
      tables,
      ...diag,
    });
  } catch (err: any) {
    const cause = (err as any)?.cause;
    res.status(500).json({
      ok: false,
      stage: "query",
      code: err?.code,
      errno: err?.errno,
      sqlState: err?.sqlState,
      message: String(err?.sqlMessage || err?.message || err),
      cause: cause
        ? {
            code: cause.code,
            errno: cause.errno,
            message: String(cause.sqlMessage || cause.message || cause),
          }
        : undefined,
      elapsedMs: Date.now() - started,
      ...diag,
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

// ─── Admin: Data Migration (Phase 1) ─────────────────────────────────────────
// Exposes backup/migrate/verify operations of scripts/migrate-data.mjs
// over HTTP so they can be run against the live Vercel DB.
// Protected by DB_REPAIR_SECRET (same as /api/db-repair).
//   GET /api/admin/migrate?action=backup|migrate|verify|all&secret=...
const BUSINESS_TABLES = [
  "users",
  "password_reset_tokens",
  "families",
  "family_members",
  "children",
  "timeline_events",
  "routine_tasks",
  "task_checkins",
  "events",
  "event_images",
  "rsvps",
  "milestone_templates",
  "connections",
  "event_join_requests",
  "member_events",
  "recommendations",
  "skills",
  "help_requests",
  "skill_matches",
  "reviews",
] as const;

async function tableExists(conn: mysql.Connection, tableName: string): Promise<boolean> {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName],
  );
  return (rows as Array<{ c: number }>)[0].c > 0;
}

async function runBackup(conn: mysql.Connection) {
  const tables: Record<string, number> = {};
  const data: Record<string, unknown[]> = {};
  let totalRows = 0;
  for (const t of BUSINESS_TABLES) {
    if (!(await tableExists(conn, t))) continue;
    const [rows] = await conn.query(`SELECT * FROM \`${t}\``);
    const list = rows as unknown[];
    tables[t] = list.length;
    data[t] = list;
    totalRows += list.length;
  }
  return { backupAt: new Date().toISOString(), totalRows, tables, data };
}

async function runMigrate(conn: mysql.Connection) {
  const results: Record<string, number | string> = {};

  const [userUpdate] = await conn.query(`
    UPDATE \`users\` SET
      \`bio\`           = COALESCE(\`bio\`, ''),
      \`location\`      = COALESCE(\`location\`, ''),
      \`skillTags\`     = COALESCE(\`skillTags\`, '[]'),
      \`creditScore\`   = COALESCE(\`creditScore\`, 100),
      \`reportedCount\` = COALESCE(\`reportedCount\`, 0)
    WHERE
      \`bio\` IS NULL OR
      \`location\` IS NULL OR
      \`skillTags\` IS NULL OR
      \`creditScore\` IS NULL OR
      \`reportedCount\` IS NULL
  `);
  results.usersUpdated = (userUpdate as { affectedRows: number }).affectedRows;

  if (await tableExists(conn, "connections")) {
    const [connUpdate] = await conn.query(`
      UPDATE \`connections\` SET
        \`category\`  = COALESCE(\`category\`, 'life'),
        \`hasUpdate\` = COALESCE(\`hasUpdate\`, 0)
      WHERE \`category\` IS NULL OR \`hasUpdate\` IS NULL
    `);
    results.connectionsUpdated = (connUpdate as { affectedRows: number }).affectedRows;
  }

  return results;
}

async function runVerify(conn: mysql.Connection) {
  const report: {
    verifiedAt: string;
    counts: Record<string, number | null>;
    orphans: Record<string, number | string>;
    v4FieldHealth: Record<string, number | string>;
  } = {
    verifiedAt: new Date().toISOString(),
    counts: {},
    orphans: {},
    v4FieldHealth: {},
  };

  for (const t of BUSINESS_TABLES) {
    if (!(await tableExists(conn, t))) {
      report.counts[t] = null;
      continue;
    }
    const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
    report.counts[t] = (rows as Array<{ c: number }>)[0].c;
  }

  const orphanQueries: Record<string, string> = {
    familyMembersWithoutFamily: `
      SELECT COUNT(*) AS c FROM \`family_members\` fm
      LEFT JOIN \`families\` f ON f.id = fm.familyId
      WHERE f.id IS NULL
    `,
    familyMembersWithoutUser: `
      SELECT COUNT(*) AS c FROM \`family_members\` fm
      LEFT JOIN \`users\` u ON u.id = fm.userId
      WHERE u.id IS NULL
    `,
    childrenWithoutFamily: `
      SELECT COUNT(*) AS c FROM \`children\` c
      LEFT JOIN \`families\` f ON f.id = c.familyId
      WHERE f.id IS NULL
    `,
    timelineEventsWithoutChild: `
      SELECT COUNT(*) AS c FROM \`timeline_events\` te
      LEFT JOIN \`children\` c ON c.id = te.childId
      WHERE c.id IS NULL
    `,
    routineTasksWithoutFamily: `
      SELECT COUNT(*) AS c FROM \`routine_tasks\` rt
      LEFT JOIN \`families\` f ON f.id = rt.familyId
      WHERE f.id IS NULL
    `,
    eventsWithoutFamily: `
      SELECT COUNT(*) AS c FROM \`events\` e
      LEFT JOIN \`families\` f ON f.id = e.familyId
      WHERE f.id IS NULL
    `,
    rsvpsWithoutEvent: `
      SELECT COUNT(*) AS c FROM \`rsvps\` r
      LEFT JOIN \`events\` e ON e.id = r.eventId
      WHERE e.id IS NULL
    `,
    connectionsWithoutUser: `
      SELECT COUNT(*) AS c FROM \`connections\` cn
      LEFT JOIN \`users\` ur ON ur.id = cn.requesterId
      LEFT JOIN \`users\` ue ON ue.id = cn.receiverId
      WHERE ur.id IS NULL OR ue.id IS NULL
    `,
  };
  for (const [key, sqlText] of Object.entries(orphanQueries)) {
    try {
      const [rows] = await conn.query(sqlText);
      report.orphans[key] = (rows as Array<{ c: number }>)[0].c;
    } catch (err: any) {
      report.orphans[key] = `error: ${String(err?.message || err)}`;
    }
  }

  const healthQueries: Record<string, string> = {
    usersMissingBio: "SELECT COUNT(*) AS c FROM `users` WHERE `bio` IS NULL",
    usersMissingSkillTags: "SELECT COUNT(*) AS c FROM `users` WHERE `skillTags` IS NULL",
    usersMissingCreditScore: "SELECT COUNT(*) AS c FROM `users` WHERE `creditScore` IS NULL",
    usersMissingReportedCount: "SELECT COUNT(*) AS c FROM `users` WHERE `reportedCount` IS NULL",
  };
  for (const [key, sqlText] of Object.entries(healthQueries)) {
    try {
      const [rows] = await conn.query(sqlText);
      report.v4FieldHealth[key] = (rows as Array<{ c: number }>)[0].c;
    } catch (err: any) {
      report.v4FieldHealth[key] = `error: ${String(err?.message || err)}`;
    }
  }

  return report;
}

app.get("/api/admin/migrate", async (req: Request, res: Response) => {
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

  const action = String(req.query.action || "verify").toLowerCase();
  const started = Date.now();
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(buildDbConfig(process.env.DATABASE_URL));
    const result: Record<string, unknown> = {
      ok: true,
      action,
      startedAt: new Date(started).toISOString(),
    };
    switch (action) {
      case "backup":
        result.backup = await runBackup(conn);
        break;
      case "migrate":
        result.migrate = await runMigrate(conn);
        break;
      case "verify":
        result.verify = await runVerify(conn);
        break;
      case "all":
        result.backup = await runBackup(conn);
        result.migrate = await runMigrate(conn);
        result.verify = await runVerify(conn);
        break;
      default:
        res.status(400).json({ ok: false, message: `Unknown action: ${action}` });
        return;
    }
    result.elapsedMs = Date.now() - started;
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      action,
      elapsedMs: Date.now() - started,
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
