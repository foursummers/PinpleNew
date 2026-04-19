/**
 * Vercel Serverless entry point.
 *
 * vercel.json 将所有 /api/* 重写到 /api，由这里的 Express 继续分发。
 * 通过 JSON 错误中间件，保证任何运行时异常都返回 JSON，
 * 不会让前端收到 Vercel 默认 HTML 500 页（"A server error has occurred"）。
 */

import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";

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

registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`[trpc] error on ${path ?? "?"}:`, error);
    },
  })
);

app.all("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
    method: req.method,
    message: "No API route matched this path.",
  });
});

// 兜底 JSON 错误处理：保证永远不会把 HTML 错误页返回给前端
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[api] Unhandled error:", err);
  if (res.headersSent) return;
  res.status(500).json({
    error: "ServerError",
    message: err?.message || "Internal server error",
  });
});

export default app;
