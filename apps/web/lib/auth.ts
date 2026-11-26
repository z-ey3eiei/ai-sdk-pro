import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { and, eq } from "drizzle-orm";

import { getPlatformDb } from "./db/client";
import { account, authTables } from "./db/schema";
import {
  getPlatformConfig,
  PlatformAuthenticationError,
  requirePlatformConfig,
  trustedPlatformOrigins,
} from "./platform-policy";
import { PLATFORM_SESSION_POLICY } from "./session-policy";
const SOCIAL_PROVIDERS = ["github", "google"] as const;

const AUTH_ENDPOINTS = new Set([
  "POST link-social",
  "POST sign-in/social",
  ...SOCIAL_PROVIDERS.flatMap(provider => [
    `GET callback/${provider}`,
    `POST callback/${provider}`,
  ]),
  "GET get-session",
  "POST get-session",
  "POST sign-out",
]);

export function isAllowedAuthEndpoint(method: string, path: string): boolean {
  return AUTH_ENDPOINTS.has(`${method} ${path}`);
}

export class GitHubConnectionRequiredError extends Error {
  readonly status = 409;
  constructor() { super("Connect GitHub in account settings."); this.name = "GitHubConnectionRequiredError"; }
}

export class AuthPolicyError extends Error {
  readonly status = 400;
  constructor(message = "Invalid authentication request.") {
    super(message);
    this.name = "AuthPolicyError";
  }
}

let authInstance: ReturnType<typeof createPlatformAuth> | null = null;
let authCacheKey = "";

export function createPlatformAuth() {
  const config = requirePlatformConfig();
  const database = getPlatformDb();
  if (!database) throw new Error("Platform database is unavailable.");
  const secureCookies = config.baseURL.startsWith("https://");
  const providers = {
    ...(config.socialProviders.github ? { github: {
      ...config.socialProviders.github, scope: ["read:user", "user:email"],
    }} : {}),
    ...(config.socialProviders.google ? { google: {
      ...config.socialProviders.google,
      redirectURI: "https://www.ai-sdk.pro/auth/platform",
    }} : {}),
  };

  return betterAuth({
    appName: "ai-sdk.pro",
    baseURL: config.baseURL,
    basePath: "/api/auth",
    secret: config.secret,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: authTables,
      schemaName: "aisdk_pro",
      transaction: false,
      debugLogs: false,
    }),
    socialProviders: providers,
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        allowDifferentEmails: true,
      },
      encryptOAuthTokens: true,
      storeStateStrategy: "database",
    },
    session: PLATFORM_SESSION_POLICY,
    advanced: {
      useSecureCookies: secureCookies,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: secureCookies,
        sameSite: secureCookies ? "none" : "lax",
        path: "/",
      },
    },
    trustedOrigins: trustedPlatformOrigins(config),
    logger: { disabled: true },
  });
}

export function getAuth() {
  const config = requirePlatformConfig();
  const database = getPlatformDb();
  if (!database) throw new Error("Platform database is unavailable.");
  const cacheKey = `${config.baseURL}:${config.neonDatabaseUrl}:${JSON.stringify(config.socialProviders)}`;
  if (!authInstance || authCacheKey !== cacheKey) {
    authInstance = createPlatformAuth();
    authCacheKey = cacheKey;
  }
  return authInstance;
}

export function resetAuthForTests(): void {
  authInstance = null;
  authCacheKey = "";
}

export async function getSessionUser(request: Request) {
  const result = await getAuth().api.getSession({
    headers: request.headers,
    query: { disableRefresh: true },
  });
  return result?.user ?? null;
}

export async function requireSessionUser(request: Request) {
  const user = await getSessionUser(request);
  if (!user) throw new PlatformAuthenticationError();
  return user;
}

export async function getGitHubAccessToken(
  request: Request,
  userId: string
): Promise<string> {
  const database = getPlatformDb();
  if (!database) throw new Error("Platform database is unavailable.");
  const rows = await database
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "github")))
    .limit(1);
  const githubAccount = rows[0];
  if (!githubAccount)
    throw new GitHubConnectionRequiredError();
  const result = await getAuth().api.getAccessToken({
    headers: request.headers,
    body: { accountId: githubAccount.id },
  });
  if (!result?.accessToken)
    throw new GitHubConnectionRequiredError();
  return result.accessToken;
}

export function publicUser(user: {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
  };
}
