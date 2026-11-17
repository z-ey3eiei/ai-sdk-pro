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
import { sendAuthEmail } from "./registration-email";

const AUTH_ENDPOINTS = new Set([
  "POST sign-up/email",
  "POST sign-in/email",
  "POST send-verification-email",
  "GET verify-email",
  "POST request-password-reset",
  "POST reset-password",
  "POST link-social",
  "POST sign-in/social",
  "GET callback/github",
  "POST callback/github",
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
  const emailReady = config.emailRegistrationAvailable;

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
    socialProviders: config.githubConfigured ? {
      github: {
        clientId: config.githubClientId,
        clientSecret: config.githubClientSecret,
        scope: ["read:user", "user:email"],
      },
    } : undefined,
    emailAndPassword: {
      enabled: emailReady,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        const url = new URL("/reset-password", config.baseURL);
        url.searchParams.set("token", token);
        void sendAuthEmail(user.email, "Reset your ai-sdk.pro password",
          "Reset your password using this single-use link: " + url.toString()).catch(() => {});
      },
    },
    emailVerification: {
      sendOnSignUp: emailReady,
      sendOnSignIn: emailReady,
      expiresIn: 3600,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => {
        void sendAuthEmail(user.email, "Verify your ai-sdk.pro email",
          "Verify your email to activate the account: " + url).catch(() => {});
      },
    },
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
  const cacheKey = `${config.baseURL}:${config.githubClientId}:${config.neonDatabaseUrl}:${config.emailRegistrationAvailable}`;
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
