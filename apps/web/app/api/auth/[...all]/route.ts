import { toNextJsHandler } from "better-auth/next-js";

import { AuthPolicyError, getAuth, isAllowedAuthEndpoint } from "@/lib/auth";
import {
  getPlatformConfig,
  isTrustedMutationOrigin,
  jsonError,
  safePlatformError,
} from "@/lib/platform-policy";
import { readLimitedBody, RequestPolicyError } from "@/lib/request-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ all?: string[] }> };

function fixedCallbackURLs(): {
  callbackURL: string;
  errorCallbackURL: string;
} {
  const config = getPlatformConfig();
  return {
    callbackURL: `${config.baseURL}/workspace`,
    errorCallbackURL: `${config.baseURL}/login?error=oauth`,
  };
}

async function fixedSocialRequest(request: Request): Promise<Request> {
  let body: unknown;
  try {
    const deadline = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(5_000),
    ]);
    body = JSON.parse(await readLimitedBody(request, deadline, 16 * 1024));
  } catch (error) {
    if (error instanceof RequestPolicyError) throw error;
    throw new AuthPolicyError();
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new AuthPolicyError();
  const input = body as Record<string, unknown>;
  const allowedKeys = new Set(["provider", "callbackURL", "errorCallbackURL"]);
  if (Object.keys(input).some(key => !allowedKeys.has(key)))
    throw new AuthPolicyError();
  if (input.provider !== "github")
    throw new AuthPolicyError("Only GitHub sign-in is available.");
  const fixed = fixedCallbackURLs();
  if (
    input.callbackURL !== undefined &&
    input.callbackURL !== fixed.callbackURL &&
    input.callbackURL !== "/workspace"
  )
    throw new AuthPolicyError("Invalid callback URL.");
  if (
    input.errorCallbackURL !== undefined &&
    input.errorCallbackURL !== fixed.errorCallbackURL &&
    input.errorCallbackURL !== "/login?error=oauth"
  )
    throw new AuthPolicyError("Invalid error callback URL.");
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ provider: "github", ...fixed }),
  });
}

async function publicSessionResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return response;
  try {
    const payload = (await response.json()) as unknown;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const record = payload as Record<string, unknown>;
      const session = record.session;
      if (session && typeof session === "object" && !Array.isArray(session)) {
        const { token: _token, ...publicSession } = session as Record<
          string,
          unknown
        >;
        record.session = publicSession;
      }
    }
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(JSON.stringify(payload), {
      status: response.status,
      headers,
    });
  } catch {
    return jsonError("Authentication response could not be read.", 500);
  }
}

async function handle(
  request: Request,
  context: RouteContext
): Promise<Response> {
  const params = await context.params;
  const path = (params.all ?? []).join("/");
  if (!isAllowedAuthEndpoint(request.method, path))
    return jsonError("Not found.", 404);
  if (
    (path === "sign-in/social" || path === "sign-out") &&
    !isTrustedMutationOrigin(request)
  ) {
    return jsonError("Origin is not allowed.", 403);
  }
  try {
    const authHandlers = toNextJsHandler(getAuth());
    if (path === "sign-in/social")
      return await authHandlers.POST(await fixedSocialRequest(request));
    const handler = authHandlers[request.method as keyof typeof authHandlers];
    if (!handler) return jsonError("Method not allowed.", 405);
    const response = await handler(request);
    if (path === "get-session") return publicSessionResponse(response);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    if (error instanceof RequestPolicyError)
      return jsonError(
        "Authentication request is too large or invalid.",
        error.status
      );
    if (error instanceof AuthPolicyError)
      return jsonError(error.message, error.status);
    const safe = safePlatformError(error);
    return jsonError(safe.message, safe.status);
  }
}

export const GET = (request: Request, context: RouteContext) =>
  handle(request, context);
export const POST = (request: Request, context: RouteContext) =>
  handle(request, context);
export const PUT = () => jsonError("Not found.", 404);
export const PATCH = () => jsonError("Not found.", 404);
export const DELETE = () => jsonError("Not found.", 404);
