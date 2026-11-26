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
type SocialProvider = "github" | "google" | "facebook" | "apple";

function fixedRedirect(path: string): string {
  return new URL(path, getPlatformConfig().baseURL).toString();
}

function fixedSocialRequest(input: Input, linking: boolean): Input {
  const allowed = new Set(["provider", "callbackURL", "errorCallbackURL"]);
  const provider = input.provider;
  if (Object.keys(input).some(key => !allowed.has(key)) ||
      !["github", "google", "facebook", "apple"].includes(String(provider)) ||
      (linking && provider !== "github"))
    throw new AuthPolicyError("Unsupported social sign-in provider.");
  const callback = linking ? "/workspace/account?linked=1" : "/workspace";
  const error = linking ? "/workspace/account?error=github" : "/login?error=oauth";
  for (const [key, target] of [["callbackURL", callback], ["errorCallbackURL", error]]) {
    if (input[key] !== undefined && input[key] !== target && input[key] !== fixedRedirect(target))
      throw new AuthPolicyError("Invalid OAuth callback.");
  }
  return { provider: provider as SocialProvider, callbackURL: fixedRedirect(callback),
    errorCallbackURL: fixedRedirect(error) };
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
      if (data.session && typeof data.session === "object" && !Array.isArray(data.session))
        delete (data.session as Input).token;
    }
    return new Response(JSON.stringify(payload), { status: response.status, headers });
  } catch {
    return jsonError("Authentication response could not be read.", 500);
  }
}

async function boundedSocialRequest(request: Request, linking: boolean): Promise<Request> {
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
  const fixed = fixedSocialRequest(body as Input, linking);
  const provider = fixed.provider as SocialProvider;
  const config = getPlatformConfig();
  if (!config.socialProviders[provider])
    throw new AuthPolicyError(`${provider} sign-in is not configured.`);
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new Request(request.url, { method: "POST", headers, body: JSON.stringify(fixed) });
}

async function handle(request: Request, context: Context): Promise<Response> {
  const params = await context.params;
  const path = (params.all ?? []).join("/");
  if (!isAllowedAuthEndpoint(request.method, path)) return jsonError("Not found.", 404);
  const isCallback = /^callback\/(github|google|facebook|apple)$/.test(path);
  if (request.method === "POST" && !isCallback && !isTrustedMutationOrigin(request))
    return jsonError("Origin is not allowed.", 403);
  try {
    if (path === "get-session") {
      return sanitizeResponse(await getAuth().api.getSession({
        headers: request.headers, query: { disableRefresh: true }, asResponse: true,
      }));
    }
    if (path === "link-social") {
      await requireSessionUser(request);
      if (!getPlatformConfig().socialProviders.github)
        return jsonError("GitHub OAuth is not configured.", 503);
    }
    const handlers = toNextJsHandler(getAuth());
    const handler = handlers[request.method as keyof typeof handlers];
    if (!handler) return jsonError("Method not allowed.", 405);
    if (request.method === "POST" && (path === "link-social" || path === "sign-in/social")) {
      const response = await handler(await boundedSocialRequest(request, path === "link-social"));
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
