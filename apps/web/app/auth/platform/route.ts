import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Google is registered with this custom redirect URI. Route its response to
 * Better Auth's provider-aware callback so the provider can be validated.
 */
export async function GET(request: Request): Promise<Response> {
  const callbackUrl = new URL(request.url);
  callbackUrl.pathname = "/api/auth/callback/google";

  const handler = toNextJsHandler(getAuth()).GET;
  if (!handler) return new Response("Method not allowed.", { status: 405 });

  return handler(new Request(callbackUrl, {
    method: "GET",
    headers: request.headers,
  }));
}
