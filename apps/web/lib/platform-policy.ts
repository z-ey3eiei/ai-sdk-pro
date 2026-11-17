import type { PlatformStatus } from "./platform-types";
import { SNAPSHOT_LIMITS } from "./platform-types";
import { SESSION_IDLE_SECONDS } from "./session-policy";

export const DEFAULT_PLATFORM_URL = "https://ai-sdk.pro";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const CONFIG_KEYS = [
  "NEON_DATABASE_URL",
  "BETTER_AUTH_SECRET",
] as const;

export class PlatformSetupRequiredError extends Error {
  readonly status = 503;
  constructor(message = "The platform is not configured yet.") {
    super(message);
    this.name = "PlatformSetupRequiredError";
  }
}
export class PlatformAuthenticationError extends Error {
  readonly status = 401;
  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "PlatformAuthenticationError";
  }
}
export type PlatformConfig = {
  baseURL: string;
  baseOrigin: string;
  secret: string;
  neonDatabaseUrl: string;
  githubClientId: string;
  githubClientSecret: string;
  githubAppSlug: string;
  githubConfigured: boolean;
  emailRegistrationAvailable: boolean;
  missingConfiguration: string[];
  configured: boolean;
};

function validBaseURL(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.protocol === "http:" && !LOOPBACK_HOSTS.has(url.hostname))
      return null;
    return url;
  } catch {
    return null;
  }
}

export function getPlatformConfig(): PlatformConfig {
  const configuredUrl =
    process.env.BETTER_AUTH_URL?.trim() || DEFAULT_PLATFORM_URL;
  const base = validBaseURL(configuredUrl);
  const missingConfiguration: string[] = CONFIG_KEYS.filter(
    key => !process.env[key]?.trim()
  );
  if (!base) missingConfiguration.push("BETTER_AUTH_URL");
  const githubAppSlug = process.env.GITHUB_APP_SLUG?.trim() || "ai-sdk-pro";
  if (
    githubAppSlug &&
    !/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/i.test(githubAppSlug)
  ) {
    missingConfiguration.push("GITHUB_APP_SLUG");
  }
  const baseURL = base?.origin ?? DEFAULT_PLATFORM_URL;
  const githubConfigured = Boolean(
    process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim()
  );
  const emailRegistrationAvailable = Boolean(
    process.env.PLATFORM_EMAIL_AUTH_ENABLED === "true" &&
    process.env.RESEND_API_KEY?.trim() &&
    process.env.RESEND_FROM_EMAIL?.trim().toLowerCase().endsWith("@mail.ai-sdk.pro")
  );
  return {
    baseURL,
    baseOrigin: baseURL,
    secret: process.env.BETTER_AUTH_SECRET?.trim() || "",
    neonDatabaseUrl: process.env.NEON_DATABASE_URL?.trim() || "",
    githubClientId: process.env.GITHUB_CLIENT_ID?.trim() || "",
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET?.trim() || "",
    githubAppSlug,
    githubConfigured,
    emailRegistrationAvailable,
    missingConfiguration: [...new Set(missingConfiguration)],
    configured: Boolean(base) && missingConfiguration.length === 0,
  };
}

export function requirePlatformConfig(): PlatformConfig {
  const config = getPlatformConfig();
  if (!config.configured) throw new PlatformSetupRequiredError();
  return config;
}

export function platformStatus(): PlatformStatus {
  const config = getPlatformConfig();
  return {
    configured: config.configured,
    githubConfigured: config.githubConfigured,
    emailRegistrationAvailable: config.emailRegistrationAvailable,
    missingConfiguration: config.missingConfiguration,
    githubAppInstallUrl: config.githubAppSlug
      ? `https://github.com/apps/${encodeURIComponent(config.githubAppSlug)}/installations/new`
      : null,
    snapshotLimits: SNAPSHOT_LIMITS,
    sessionIdleSeconds: SESSION_IDLE_SECONDS,
  };
}

export function trustedPlatformOrigins(config = getPlatformConfig()): string[] {
  const origins = [config.baseOrigin];
  try {
    const url = new URL(config.baseOrigin);
    if (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname))
      origins.push(url.origin);
  } catch {
    // Invalid configuration is reported by status; auth never initializes.
  }
  return [...new Set(origins)];
}

export function isTrustedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return trustedPlatformOrigins().includes(origin);
}

export function noStoreHeaders(): Headers {
  const headers = new Headers();
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

export function jsonError(message: string, status: number): Response {
  return Response.json(
    { error: message },
    { status, headers: noStoreHeaders() }
  );
}

export function safePlatformError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof PlatformSetupRequiredError)
    return { message: "Platform setup is required.", status: 503 };
  if (error instanceof PlatformAuthenticationError)
    return { message: "Authentication is required.", status: 401 };
  if (error instanceof Error && error.name === "GitHubConnectionRequiredError")
    return { message: "Connect GitHub in account settings.", status: 409 };
  if (error instanceof Error && error.name === "GitHubPermissionError")
    return {
      message: "GitHub access was denied for this repository.",
      status: 403,
    };
  if (error instanceof Error && error.name === "GitHubRateLimitError")
    return {
      message: "GitHub is rate limiting requests. Try again later.",
      status: 429,
    };
  if (error instanceof Error && error.name === "PlatformRequestTimeoutError")
    return {
      message: "The repository request timed out. Try again later.",
      status: 504,
    };
  return {
    message: "The platform request could not be completed.",
    status: 500,
  };
}

const requestBuckets = new Map<
  string,
  { windowStart: number; count: number }
>();
export function checkPlatformRateLimit(
  userId: string,
  bucket = "read",
  now = Date.now()
): boolean {
  const key = `${bucket}:${userId}`;
  const windowMs = bucket === "import" ? 60_000 : 10_000;
  const max = bucket === "import" ? 2 : 30;
  const current = requestBuckets.get(key);
  if (!current || now - current.windowStart >= windowMs) {
    requestBuckets.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}
export function resetPlatformRateLimitsForTests(): void {
  requestBuckets.clear();
}
