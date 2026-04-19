import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Retry upsert up to 3 times to handle transient ECONNRESET
      let upsertErr: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await db.upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            lastSignedIn: new Date(),
          });
          upsertErr = null;
          break;
        } catch (err: any) {
          upsertErr = err;
          const isConnReset = err?.message?.includes('ECONNRESET') || err?.cause?.code === 'ECONNRESET';
          if (isConnReset && attempt < 2) {
            db.resetDb();
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
            continue;
          }
          break;
        }
      }
      if (upsertErr) {
        console.error("[OAuth] upsertUser failed after retries", upsertErr);
        // Continue anyway - session token still valid, user data will sync next login
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      // Redirect to home with error param instead of showing raw 500
      res.redirect(302, "/?auth_error=1");
    }
  });
}
