export const ENV = {
  // appId is a Manus-OAuth leftover that we still embed in session JWTs.
  // It MUST be a non-empty string, otherwise verifySession() rejects the
  // cookie and every protected route returns 401. Default to the project
  // slug so email/password deployments don't need to set VITE_APP_ID.
  appId: process.env.VITE_APP_ID || "pinple",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
