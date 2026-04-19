/**
 * Vercel Serverless entry point.
 *
 * 把原来的 Express (`server/_core/index.ts`) 裁剪出 API 部分，
 * 交给 Vercel Node 运行时托管。静态前端仍由 Vercel 直接服务 `dist/public/`。
 *
 * 所有 `/api/*` 请求都会命中这个 catch-all 函数。
 */

import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

export default app;
