import { toNextJsHandler } from "better-auth/next-js";

import {
  AuthPolicyError, getAuth, isAllowedAuthEndpoint, requireSessionUser,
} from "@/lib/auth";
import {
  getPlatformConfig, isTrustedMutationOrigin, jsonError, safePlatformError,
} from "@/lib/platform-policy";
import { readLimitedBody, RequestPolicyError } from "@/lib/request-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ all?: string[] }> };
type Input = Record<string, unknown>;
type Flow = "sign-in/social" | "link-social" | "sign-up/email" | "sign-in/email" |
  "send-verification-email" | "request-password-reset" | "reset-password";

function fixedRedirect(path: string): string {
  return new URL(path, getPlatformConfig().baseURL).toString();
}

function fixedSocialRequest(input: Input, linking: boolean): Input {
  const allowed = new Set(["provider", "callbackURL", "errorCallbackURL"]);
  if (Object.keys(input).some(key => !allowed.has(key)) || input.provider !== "github")
    throw new AuthPolicyError("Only GitHub OAuth is available.");
  const callback = linking ? "/workspace/account?linked=1" : "/workspace";
  const error = linking ? "/workspace/account?error=github" : "/login?error=oauth";
  for (const [key, target] of [["callbackURL", callback], ["errorCallbackURL", error]]) {
    if (input[key] !== undefined && input[key] !== target && input[key] !== fixedRedirect(target))
      throw new AuthPolicyError("Invalid OAuth callback.");
  }
  return { provider: "github", callbackURL: fixedRedirect(callback),
    errorCallbackURL: fixedRedirect(error) };
}

function emailOf(value: unknown): string {
  if (typeof value !== "string" || value.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    throw new AuthPolicyError("Invalid email address.");
  return value.trim().toLowerCase();
}
function passwordOf(value: unknown): string {
  if (typeof value !== "string" || value.length < 12 || value.length > 128)
    throw new AuthPolicyError("Password must contain 12 to 128 characters.");
  return value;
}
function tokenOf(value: unknown): string {
  if (typeof value !== "string" || value.length < 8 || value.length > 2048)
    throw new AuthPolicyError("Invalid authentication token.");
  return value;
}
function exactKeys(input: Input, allowed: string[]) {
  if (Object.keys(input).some(key => !allowed.includes(key)))
    throw new AuthPolicyError("Unsupported authentication field.");
}
function fixedEmailRequest(path: Flow, input: Input): Input {
  if (path === "sign-up/email") {
    exactKeys(input, ["name", "email", "password", "callbackURL"]);
    if (typeof input.name !== "string" || input.name.trim().length < 2 ||
        input.name.trim().length > 80)
      throw new AuthPolicyError("Enter a name between 2 and 80 characters.");
    return {
      name: input.name.trim(),
      email: emailOf(input.email),
      password: passwordOf(input.password),
      callbackURL: fixedRedirect("/login?verified=1"),
    };
  }
  if (path === "sign-in/email") {
    exactKeys(input, ["email", "password", "rememberMe", "callbackURL"]);
    if (input.rememberMe !== undefined && typeof input.rememberMe !== "boolean")
      throw new AuthPolicyError();
    return {
      email: emailOf(input.email),
      password: passwordOf(input.password),
      rememberMe: input.rememberMe === true,
      callbackURL: fixedRedirect("/workspace"),
    };
  }
  if (path === "send-verification-email") {
    exactKeys(input, ["email", "callbackURL"]);
    return { email: emailOf(input.email),
      callbackURL: fixedRedirect("/login?verified=1") };
  }
  if (path === "request-password-reset") {
    exactKeys(input, ["email", "redirectTo"]);
    return { email: emailOf(input.email), redirectTo: fixedRedirect("/reset-password") };
  }
  if (path === "reset-password") {
    exactKeys(input, ["newPassword", "token"]);
    return { newPassword: passwordOf(input.newPassword), token: tokenOf(input.token) };
  }
  throw new AuthPolicyError();
}

async function boundedAuthRequest(request: Request, path: Flow): Promise<Request> {
  let body: unknown;
  try {
    body = JSON.parse(await readLimitedBody(
      request, AbortSignal.any([request.signal, AbortSignal.timeout(5000)]), 8192
    ));
  } catch (error) {
    if (error instanceof RequestPolicyError) throw error;
    throw new AuthPolicyError();
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new AuthPolicyError();
  const input = body as Input;
  const next = path === "sign-in/social" || path === "link-social"
    ? fixedSocialRequest(input, path === "link-social")
    : fixedEmailRequest(path, input);
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new Request(request.url, {
    method: "POST", headers, body: JSON.stringify(next),
  });
}

/** Never echo a server-session token into a browser-readable JSON response. */
async function sanitizeResponse(response: Response): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  if (!(headers.get("content-type") || "").includes("application/json"))
    return new Response(response.body, { status: response.status, headers });
  try {
    const payload = await response.json() as unknown;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const data = payload as Input;
      delete data.token;
      if (data.session && typeof data.session === "object" && !Array.isArray(data.session)) {
        delete (data.session as Input).token;
      }
    }
    return new Response(JSON.stringify(payload), { status: response.status, headers });
  } catch {
    return jsonError("Authentication response could not be read.", 500);
  }
}

async function handle(request: Request, context: Context): Promise<Response> {
  const params = await context.params;
  const path = (params.all ?? []).join("/");
  if (!isAllowedAuthEndpoint(request.method, path)) return jsonError("Not found.", 404);
  if (request.method === "POST" &&
      path !== "callback/github" && !isTrustedMutationOrigin(request))
    return jsonError("Origin is not allowed.", 403);

  const config = getPlatformConfig();
  const emailPaths = new Set([
    "sign-up/email", "sign-in/email", "send-verification-email",
    "request-password-reset", "reset-password",
  ]);
  if (emailPaths.has(path) && !config.emailRegistrationAvailable)
    return jsonError("Email registration is not enabled.", 503);
  if ((path === "sign-in/social" || path === "link-social") && !config.githubConfigured)
    return jsonError("GitHub OAuth is not configured.", 503);
  try {
    if (path === "get-session") {
      const response = await getAuth().api.getSession({
        headers: request.headers,
        query: { disableRefresh: true },
        asResponse: true,
      });
      return sanitizeResponse(response);
    }
    if (path === "link-social") await requireSessionUser(request);
    const handlers = toNextJsHandler(getAuth());
    const handler = handlers[request.method as keyof typeof handlers];
    if (!handler) return jsonError("Method not allowed.", 405);

    if (request.method === "GET" && path === "verify-email") {
      const fixed = new URL(request.url);
      fixed.searchParams.set("callbackURL", fixedRedirect("/login?verified=1"));
      const response = await handler(new Request(fixed, {
        method: "GET", headers: request.headers,
      }));
      return sanitizeResponse(response);
    }
    if (request.method === "POST" &&
        (emailPaths.has(path) || path === "link-social" || path === "sign-in/social")) {
      const response = await handler(await boundedAuthRequest(request, path as Flow));
      if (path === "request-password-reset" && response.status >= 200 && response.status < 300)
        return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
      return sanitizeResponse(response);
    }
    return sanitizeResponse(await handler(request));
  } catch (error) {
    if (error instanceof RequestPolicyError)
      return jsonError("Authentication request is too large or invalid.", error.status);
    if (error instanceof AuthPolicyError)
      return jsonError(error.message, error.status);
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}

export const GET = (request: Request, context: Context) => handle(request, context);
export const POST = (request: Request, context: Context) => handle(request, context);
export const PUT = () => jsonError("Not found.", 404);
export const PATCH = () => jsonError("Not found.", 404);
export const DELETE = () => jsonError("Not found.", 404);
