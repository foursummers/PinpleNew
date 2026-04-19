import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // Why sameSite=lax instead of none:
  //   - sameSite=none REQUIRES secure=true, and on Vercel `req.protocol` is always
  //     "http" (TLS terminates at the edge). If the x-forwarded-proto header is
  //     ever missing / not trusted by Express, `secure` becomes false and the
  //     browser SILENTLY REJECTS the cookie — leaving auth broken with no
  //     visible error. `lax` is safer: it always allows the cookie for
  //     same-site requests (which covers 100% of our frontend → /api/trpc
  //     traffic) and doesn't require `secure`.
  //   - We still set `secure` on HTTPS requests as defense-in-depth.
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
  };
}
